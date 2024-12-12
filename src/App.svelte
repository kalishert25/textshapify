<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Carousel from "$lib/components/ui/carousel/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "$lib/components/ui/select/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import { Item } from "$lib/components/ui/dropdown-menu";
  import { getBoundsArray } from "./edge-detection";

  const fonts = [
    "Helvetica",
    "Arial",
    "Arial Black",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Impact",
    "Times New Roman",
    "Georgia",
    "Courier",
    "Comic Sans MS",
  ];

  const fontSizes = [
    "10",
    "12",
    "14",
    "16",
    "18",
    "20",
    "24",
    "28",
    "32",
    "36",
    "48",
    "64",
    "72",
  ];
  let boundsArr = $state();
  function formatText(
    text: string,
    boundsArr,
    width: number,
    fontSize: number,
    lineHeight: number,
    charAspectRatios: number[],
  ) {
    width = width;
    lineHeight *= fontSize;
    // console.log(lineHeight + " " + fontSize);
    // console.log(`client width: ${width}`);
    // console.log(`bounds array:`);
    // console.log(boundsArr);
    // console.log("aspect rATIOS");
    // console.log(charAspectRatios[32]);

    if (!boundsArr) {
      return text;
    }

    // console.log("boundsArr");
    // console.log(boundsArr);
    //text justification algorithm
    const newText = [];
    let index = 0;

    for (let lineNum = 0; lineNum < boundsArr.length; lineNum++) {
      const lineBoundaries = boundsArr[lineNum];

      let line = [];

      if (lineBoundaries.includedRanges.length === 0) {
        newText.push("\n");
        continue;
      }

      const outputWidth = width;
      let lineWidthPX = 0;
      //adding left margin
      while (lineWidthPX < outputWidth) {
        let asciiCode = text.charCodeAt(index);

        if (lineBoundaries.inBounds(lineWidthPX / outputWidth)) {
          lineWidthPX += charAspectRatios[asciiCode] * (fontSize + lineHeight);
          line.push(text[index]);
          // if (repeatText.checked) {
          index = (index + 1) % text.length;
          // } else {
          //     index++;
          // }

          continue;
        }
        lineWidthPX += charAspectRatios[32] * (fontSize + lineHeight);

        line.push(" ");
      }

      //if we're on a line

      line.push("\n");
      newText.push(...line);
    }
    // console.log(newText);
    return newText.join("");
  }

  async function thresholdImage(
    imageUrl: string,
    threshold = 50,
    invert = false,
  ) {
    // Create an off-screen canvas
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext("2d")!;

    // Load the image
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });
    const aspectRatio = img.height / img.width;
    // Set canvas size to match the image
    canvas.width = 256;
    canvas.height = 256 * aspectRatio;

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0, 256, 256 * aspectRatio);

    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const realThreshold = threshold * 2.55;
    // Apply thresholding
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      const alpha = data[i + 3];
      // Apply threshold
      const value = gray >= realThreshold ? 255 : 0;

      // Set RGB channels to the thresholded value
      data[i] = data[i + 1] = data[i + 2] = value;
    }

    // Put the modified image data back on the canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to blob
    const blob = await canvas.convertToBlob();

    // Convert blob to base64
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

    return base64 as string;
  }
  function getImageDimensions(base64Image: string) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = (err) => {
        reject(err);
      };
    });
  }

  const getBoundsSelectedImg = async () => {
    if (
      Number.isNaN(charAspectRatios[0]) ||
      !Number.isFinite(charAspectRatios[0])
    ) {
      return;
    }
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = thresholdedImages[selectedImage];
    });
    img.height = 256;
    img.width = 256;
    // console.log(img);
    return getBoundsArray(
      img,
      selectedSize,
      lineHeight,
      cw,
      img.width,
      img.height,
    );
  };

  const lineHeight = 1.;
  let selectedSize = $state(0);
  let inputText = $state("");
  let selectedFont = $state("");
  let charAspectRatios = $derived.by(() => {
    const ratios = new Array(128).fill(0);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = `${selectedSize}px ${selectedFont}`;
    for (let i = 0; i < 128; i++) {
      const currChar = String.fromCharCode(i);
      const textMetrics = ctx.measureText(currChar);
      const textMetrics2 = ctx.measureText(currChar + currChar);

      //const charWidth = textMetrics.actualBoundingBoxRight + textMetrics.actualBoundingBoxLeft
      const charWidth = textMetrics.width;

      // const charWidth2 = textMetrics2.actualBoundingBoxRight + textMetrics2.actualBoundingBoxLeft
      const charWidth2 = textMetrics2.width;

      const charHeight =
        textMetrics.fontBoundingBoxAscent - textMetrics.fontBoundingBoxDescent;

      ratios[i] =  .5 * (charWidth2 - charWidth) / (charHeight * (1));
    }

    return ratios;
  });

  let images = $state(["circle.png", "mandelbrot.png", "triangle.png"]);
  let selectedImage = $state(0);
  let thresholds = $state([50, 50, 50]);
  let shapifiedText = $state("");
  let thresholdedImages: string[] = $state([
    "circle.png",
    "mandelbrot.png",
    "triangle.png",
  ]); // defualt values to make loading smoother

  (async () => {
    for await (const [i, image] of images.entries()) {
      thresholdedImages[i] = await thresholdImage(image, thresholds[i]);
    }
  })();

  let cw = $state();
  let ch = $state();

  const uploadImage = (ev: Event) => {
    let image = ev.target!.files[0];

    const fileReader = new FileReader();

    fileReader.onload = (e: ProgressEvent<FileReader>) => {
      images.unshift(e.target!.result as string);
      thresholds.unshift(50);
      thresholdImage(e.target!.result as string, 50).then((t) => {
        thresholdedImages.unshift(t);
      });
    };
    fileReader.readAsDataURL(image);
  };
</script>

<main>
  <div class="grid gap-4 max-w-2xl mx-auto pt-5 px-3 pb-10">
    <h2 class="py-3 text-2xl font-semibold">Shapify Text</h2>
    <p>
      This is a tool that formats text by strategically adding line breaks to
      make it fit into a shape.
    </p>
    <Label for="message">Unformatted text</Label>
    <Textarea
      bind:value={inputText}
      placeholder="Type your text here."
      id="message"
    />
    <div class=" grid w-full items-center gap-1.5">
      <h3 class="py-3">
        Choose an image below or upload your own. Uploaded images will be
        processed automatically.
      </h3>
      <Label for="picture">Upload an image</Label>
      <Input id="picture" accept="" type="file" onchange={uploadImage} />
    </div>
    <Carousel.Root>
      <Carousel.Content class="gap-2 flex px-6">
        {#each images as image, i}
          <Carousel.Item
            class={" md:basis-1/3 p-0 rounded-md border flex flex-col items-center justify-between" +
              (i == selectedImage ? " border-violet-400 " : "")}
          >
            <!-- <div class=" w-full"> -->
            <!-- <button class="relative left-2 top-2  rounded-md py-1 px-2 text-sm text-violet-500 border-clear border hover:border-violet-500 hover:bg-violet-50">Invert</button> -->
            <!-- </div> -->
            <button
              aria-label={image}
              onclick={() => {
                selectedImage = i;
              }}
            >
              <img
                alt={image}
                class="h-50 py-1"
                src={thresholdedImages[i]}
              /></button
            >
            <div
              class={"flex w-full max-h-10 items-center justify-between pl-1 pb-1 space-x-2 border-t" +
                (i == selectedImage ? " border-t-violet-400" : "")}
            >
              <Label class="font-sm pl-2" for="threshold">Threshold</Label>
              <div class="relative">
                <input
                  type="number"
                  id="threshold"
                  onclick={(e) => {
                    if (i != selectedImage) {
                      selectedImage = i;
                      return;
                    }
                  }}
                  onchange={(e) => {
                    thresholds[i] = Math.min(Math.max(thresholds[i], 0), 100);
                    thresholdImage(image, thresholds[i]).then((t) => {
                      thresholdedImages[i] = t;
                    });
                  }}
                  class="border-none focus-visible:ring-offset-0 focus-visible:ring-0 !focus:border-none focus-visible:outline-none"
                  bind:value={thresholds[i]}
                  min="0"
                  max="100"
                />
                <div
                  class="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none"
                >
                  <span class="text-slate-500 sm:text-sm">%</span>
                </div>
              </div>
            </div>
          </Carousel.Item>
        {/each}
      </Carousel.Content>
      <Carousel.Previous />
      <Carousel.Next />
    </Carousel.Root>

    <div class="flex space-x-4">
      <div class="w-1/2">
        <label
          for="font-select"
          class="block text-sm font-medium text-slate-700 mb-1">Font</label
        >
        <Select onSelectedChange={(e) => (selectedFont = e?.value as string)}>
          <SelectTrigger id="font-select" class="w-full">
            <SelectValue placeholder="Select a font" />
          </SelectTrigger>
          <SelectContent>
            {#each fonts as font}
              <SelectItem style={"font-family:" + font} value={font}
                >{font}</SelectItem
              >
            {/each}
          </SelectContent>
        </Select>
      </div>
      <div class="w-1/2">
        <label
          for="size-select"
          class="block text-sm font-medium text-slate-700 mb-1">Font Size</label
        >
        <Select
          onSelectedChange={(e) =>
            (selectedSize = Number.parseInt(e?.value as string))}
        >
          <SelectTrigger id="size-select" class="w-full">
            <SelectValue placeholder="Select a size" />
          </SelectTrigger>
          <SelectContent>
            {#each fontSizes as size}
              <SelectItem value={size}>{size}px</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    </div>
    <Button
      onclick={async () => (boundsArr = await getBoundsSelectedImg())}
      class="bg-violet-600 hover:bg-violet-700">Shapify!</Button
    >
    <div class="mt-4 p-4 border rounded-md">
      <p class="text-sm text-slate-500 mb-2">Preview:</p>
      <p
        bind:clientWidth={cw}
        bind:clientHeight={ch}
        style="font-family: {selectedFont}; font-size: {selectedSize}px; line-height:{lineHeight};"
        class="min-h-40 whitespace-pre break-words"
      >
        {formatText(
          inputText,
          boundsArr,
          cw,
          selectedSize,
          lineHeight,
          charAspectRatios,
        )}
      </p>
    </div>
  </div>
</main>
