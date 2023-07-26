import {
  getOriginPrivateDirectory,
  showSaveFilePicker,
} from "native-file-system-adapter";
// @ts-expect-error no declaration file
import indexedDbAdapter from "native-file-system-adapter/src/adapters/indexeddb.js";

const PRESIGNED_URLS =
  "https://development-nearbysky-user-contents.s3.ap-southeast-2.amazonaws.com/64bf77f4e5811400230607eb/PPGWDU_4k_video.mp4?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEKH%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0xIkgwRgIhAIn1H2hme5sPvRyU1qDn4ram8FbL5jhigz9ChRoqOKDaAiEA0xqgYXoEnliamxQM8Ju7CX8vmRFJrpnHHh9f1LvrBvEqhQMIOhAEGgw3NjU4OTU2NDU1MDAiDPjJgKVLV08uFhvFzCriAswqxz3jjdwmQm59swDLYwyGFpptsdIJ%2FlygtmnJ7zH0gMmVsQxfu4Yl0DcfqHrjCEao9wtdqTvv0zdpUG4Lg3NcxB%2F%2F0MHXbtJjEl7xNPvCDzIZZDzTOmEjs0ucuyg3%2FqH3MUFFwl8ZEcyVWBE%2FqVeyL2Gg%2BlEzH4%2FtU3NSoVEk4e54x%2BWwPtUpCxs8IwYjg25qP53zl2tBpPgIy4meLhbI6rH57uHkpi%2FUx2%2Fjt1rButeBSG4FlVgMaHBTFoBgMN2%2FEvrFyPinSWdutp3%2FLlJa%2BMEdd7XhVLP67me%2BS7EatP60EG9LAZn%2FD5NYGpQen9BeIJ1nmwxFRHfBegvPpDIyax97GUVYNvS%2BgI9WluVHQZ47GjhAsmOQEhuicCdXAxdBxquP9RZaSSO6%2FViTzlw5w3GDNqml5bw4kYuED7hoBWYCZFkx0ugT9r%2BovRSJfwQXAAWGopG2hFSHGp4EUyzXezDE3oGmBjqyAj02CzkZ0q9wtLGy8DaMJAL69%2F%2F5z1wcAaCVvT6aDYlb50tyCJ%2BnGaWGtjaLnnst7buNAv7BErJkkeGkTMcHipcPgZPHjGpC1BW7F4V77XPxs82mucT%2Fc5CUYSJfADPPei6%2BG79UUnR9sYJW7DDJIoRKRSrfcIHhZTHuevoxHdNz%2BREjCJz9mbKhiQFh0vd34FTFHygqydUFtpuWi%2FLZ6I%2FaRH0m8ZDa9pDSdwTYXIB5OpJuToA9LkJYWvzIsPcYoIumKYdVvCDrKYzlnJeAqjWmhEGsP3NJFeF6Dqtm0S6762YRkcJmYFQ2zqVoMUJDdU13covJjxJ%2Fzl5ZqHvWAEx%2BDHQu8OMoT1vHqu%2BFyZpctTpaO7N6hQ6NEpQ5cR%2Bw2BlvYSZmrpNjoSqS5epjO%2B9Nkw%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20230726T005838Z&X-Amz-SignedHeaders=host&X-Amz-Expires=43200&X-Amz-Credential=ASIA3EUXQDE6KGVO4IL6%2F20230726%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Signature=444b4abf5f2e317df3db429fb7a4b29e8d64350c66dcbcfa1b55359521a594a2";
const FILENAME = "PPGWDU_4k_video.mp4";

const URL_INPUT = document.querySelector("#url-input") as HTMLInputElement;
const FILENAME_INPUT = document.querySelector(
  "#filename-input"
) as HTMLInputElement;
const BUTTON_START = document.querySelector(
  "#start-download"
) as HTMLInputElement;
const PROGRESS_BAR = document.querySelector("#progress") as HTMLInputElement;

URL_INPUT.value = PRESIGNED_URLS;
FILENAME_INPUT.value = FILENAME;

const ONE_MB = 1024 * 1024;

async function fetchWithRange(url: string, start: number, end: number) {
  const res = await fetch(url, {
    headers: {
      range: `bytes=${start}-${end}`,
    },
  });

  return res;
}

function getRangeAndLength(contentRange: string | null) {
  if (contentRange) {
    const [range, length] = contentRange.split("/");
    const [start, end] = range.split("-");

    return {
      start: parseInt(start),
      end: parseInt(end),
      length: parseInt(length),
    };
  }

  throw Error("No content range in headers!");
}

type RangeAndLength = {
  start: number;
  end: number;
  length: number;
};

export const isComplete = ({ end, length }: RangeAndLength) =>
  end === length - 1;

async function downloadInChunks(url: string, filename: string) {
  const dirHandle = await getOriginPrivateDirectory(indexedDbAdapter);

  const filehandle = await dirHandle.getFileHandle(filename, { create: true });
  const file = await filehandle.getFile();

  let rangeAndLength = { start: -1, end: -1, length: -1 };

  if (file.size) {
    // File already on the disk should resume when available
    // the size here should represent the start of the download if file already there
    // since we dont know the length are, we use -1.
    rangeAndLength = { start: file.size, end: file.size + ONE_MB, length: -1 };
  }

  const writeable = await filehandle.createWritable({
    keepExistingData: true,
  });

  while (!isComplete(rangeAndLength)) {
    const { end, length } = rangeAndLength;
    const nextRange = { start: end + 1, end: end + ONE_MB };

    PROGRESS_BAR.innerHTML = `${nextRange.start} / ${length}`;

    const res = await fetchWithRange(url, nextRange.start, nextRange.end);
    const buffer = await res.blob();

    writeable.write(buffer);

    if (res.ok) {
      rangeAndLength = getRangeAndLength(res.headers.get("Content-Range"));
    } else {
      if (res.status === 416) {
        // Remove cache on indexed db if the download cannot be resumed
        // TODO: The function for removing cache is broken
        // await filehandle.remove()
        throw Error("Download Error, Removing Cache");
      } else {
        throw Error("Unknown Error!");
      }
    }
  }

  // Saving on the indexeddb store are done
  await writeable.close();

  // Save on the disk, preferably on download folders
  const completedFile = filehandle.getFile();
  const fileSaveHandler = await showSaveFilePicker({
    _preferPolyfill: false,
    suggestedName: "Untitled.png",
    _name: filename,
    accepts: [
      { accept: { "image/png": ["png"] } },
      { accept: { "image/jpg": ["jpg"] } },
      { accept: { "image/webp": ["webp"] } },
      { accept: { "video/mp4": ["mp4"] } },
    ],
    excludeAcceptAllOption: false, // default
  });

  const writeDisk = await fileSaveHandler.createWritable({
    keepExistingData: false,
  });
  await writeDisk.write(completedFile);
  await writeDisk.close();
}

// await downloadInChunks(PRESIGNED_URLS, "PPGWDU_4k_video.mp4");
BUTTON_START.addEventListener("click", async () => {
  const url = URL_INPUT.value;
  const filename = FILENAME_INPUT.value;

  await downloadInChunks(url, filename);
});
