interface PixelRow {
    includedRanges: { start: number, end: number }[];
    firstPixelIsBG: boolean;
    lastPixelIsBG: boolean;
}

class PixelRow {
    constructor(
        data: Uint8ClampedArray,
        edges: number[],
        firstPixel: number,
        lastPixel: number,
    ) {
        this.includedRanges = [];
        this.firstPixelIsBG = isWhiteOrTransparent(data, firstPixel);
        this.lastPixelIsBG = isWhiteOrTransparent(data, lastPixel);
        // if the first pixel is not a BG (transparent or white), then .
        if ((edges.length <= 1 || edges.length % 2 == 1) && !this.firstPixelIsBG)
            edges.unshift(0);
        if ((edges.length <= 2 || edges.length % 2 == 1) && !this.lastPixelIsBG)
            edges.push(1);
        for (let i = 1; i < edges.length; i += 2) {
            this.includedRanges.push({ start: edges[i - 1], end: edges[i] });
        }
    }
    inBounds = (x: number) =>
        this.includedRanges.some(
            ({ start, end }: { start: number; end: number }) => x >= start && x < end,
        );
    //checks whether a given proportion is part of the foreground
}
function isWhiteOrTransparent(data: Uint8ClampedArray, pixelIndex: number) {
    // Extract the RGBA values from the pixel
    const red = data[pixelIndex];
    const green = data[pixelIndex + 1];
    const blue = data[pixelIndex + 2];
    const alpha = data[pixelIndex + 3];

    return alpha === 0 || (red === 255 && green === 255 && blue === 255);
}
export function getBoundsArray(
    image: CanvasImageSource,
    fontSize: number,
    lineHeight: number,
    clientWidthPX: number,
    imgWidth: number,
    imgHeight: number
    // clientHeightPX: number,
) {

    lineHeight *= fontSize
    const boundsArr = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    
    //   const clientWidthPX = document.getElementById("picture-output").clientWidth;
    const clientHeightPX = (clientWidthPX / imgWidth) * imgHeight;
    // console.log(clientHeightPX)
    const clientRowHeightPX = fontSize + lineHeight;
    // console.log(clientRowHeightPX);
    // console.log(clientHeightPX);
    canvas.width = Math.round(clientWidthPX);
    canvas.height = Math.round(clientHeightPX / clientRowHeightPX) * 2;
    // console.log(
    //     canvas.width +
    //     " x " +
    //     canvas.height +
    //     ". fs=" +
    //     fontSize +
    //     " lh=" +
    //     lineHeight,
    // );

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imageData;

    for (let y = 0; y < height; y++) {
        const edges = []; //edges between background and object

        for (let x = 1; x < width; x++) {
            const prevPixelIndex = (y * width + x - 1) * 4; //rgba image data
            const prevIsWhiteOrTransparent = isWhiteOrTransparent(
                data,
                prevPixelIndex,
            );
            const currPixelIndex = (y * width + x) * 4;
            const currIsWhiteOrTransparent = isWhiteOrTransparent(
                data,
                currPixelIndex,
            );
            if (prevIsWhiteOrTransparent == currIsWhiteOrTransparent) continue;
            edges.push(x / canvas.width);
            //intervals are inclusive-exclusive
        }
        edges.push();
        boundsArr.push(
            new PixelRow(data, edges, y * width * 4, (y * width + (width - 1)) * 4),
        );
    }

    return boundsArr;
}
