import {
  getOriginPrivateDirectory,
  showSaveFilePicker,
} from "native-file-system-adapter";
// @ts-expect-error no declaration file
import indexedDbAdapter from "native-file-system-adapter/src/adapters/indexeddb.js";

const PRESIGNED_URLS =
  "https://development-nearbysky-user-contents.s3.ap-southeast-2.amazonaws.com/64bf77f4e5811400230607eb/pexels_videos_4728%20%282160p%29.mp4?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEK%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLXNvdXRoZWFzdC0xIkcwRQIgIz78FflFtXodGTnVLXevuCjP0ZrCycqaJlF7JNkBhzsCIQC7I%2FnwYQk6kXb%2BHxWYt7pYlAE%2Bwyn6bQ1cYRf7Dz6EEyqFAwhIEAQaDDc2NTg5NTY0NTUwMCIMxvbXRzx105qm%2BN%2BtKuICEyMw%2FQlkDgLXXg9tPNNWfXEFmz2QeKFFppShrzU2PJBH%2F0%2Bs3OgYqxGMW%2F3t1hadIMXhjGhZwhiykd0OFHNk38bxSBtLnYOZIO7MEWBIpaqIFBX3uU76iHzhWAaEoeMEdtyGisUyBcJTBwMP0HM9%2FamevvgCNgLsclOjdgm2VRVZKXxTqfXyC5UimwvNhLF5qKrjS9uwqgDY%2B3RAhyzhJdMjZqCfHhR9OoJR5C4Ot7zdm98zgM5PF%2Bs%2FdHA7mI5y7d%2FySIu6Ky6h9dGz6FnCtk8bLM9jcO5f0YdB4D3CjiuU3%2FMhr3nsopUcBYBdMJA5f6Tdi%2B%2FSj02krXZ4leBE2C0qKvuwrHooU4u9wBOBjOSuoavk5UgdPw22g9qhvRlxfFhJw2avL3N3OFt5fMKQ4iDid0yW0dzTFSxZDg1%2FmowWFo2CKuxvTIt8ZdcMpL13H6XeKB4e%2FcZ9hKRLrAmuo98wMLbqhKYGOrMCxbNm73eOwv94i8wU5BkjoysslvprbXRnVjka%2FECjHBTxUcqTdUrXCALul5uj2gbnJrIaD%2Bo3sWF8nBCBBVmzfrxDWL0rLoHfMmaJy3RpImPF0VrnK872ZGx1Gs%2BSVo5TuZnKwPhuEu02NoRzXydos96zeVuqltWSSZc%2FMjmpQhhNdqab5NGREZ0NmMj8PDuBeSsHoduhsSOac2i1afFuDhRnzPa6bfZiRS3C8wH%2FhvcdHHseDXx6B1jecn2G8uhmdTbM%2B2q7jCyEQNBLgnGdl6W05Y7YeFmrMFJLj7fpe0LQgQsv81zXrActM1dBSKf5WLEv5tRn8jh435V7FogyldN%2Fres73o9NHKaaP5RA%2ByQetINtsV%2BA9LHGtvqN4RlK%2BxNDO%2BUK5Or%2Bc%2FSL4N0dJb2GIw%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20230726T150140Z&X-Amz-SignedHeaders=host&X-Amz-Expires=43200&X-Amz-Credential=ASIA3EUXQDE6OKSAN5UL%2F20230726%2Fap-southeast-2%2Fs3%2Faws4_request&X-Amz-Signature=d24c155a289be377ea75f853c948c9e98c1fd951168c94065a1be8de5e6e908e";
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
        await dirHandle.removeEntry(filename);
        throw Error("Download Error, Removing Cache");
      } else {
        throw Error("Unknown Error!");
      }
    }
  }

  // Saving on the indexeddb store are done
  await writeable.close();
  // @ts-expect-error no type
  await downloadFile(filename, dirHandle);
}

async function downloadFile(
  filename: string,
  dirHandle: FileSystemDirectoryHandle
) {
  const completedFileHandle = await dirHandle.getFileHandle(filename, {
    create: false,
  });
  const completedFile = await completedFileHandle.getFile();

  const fileSaveHandler = await showSaveFilePicker({
    _preferPolyfill: false,
    suggestedName: filename,
    accepts: [
      { accept: { "image/png": ["png"] } },
      { accept: { "image/jpg": ["jpg"] } },
      { accept: { "image/webp": ["webp"] } },
      { accept: { "video/mp4": ["mp4"] } },
    ],
    excludeAcceptAllOption: false, // default
  });

  await completedFile.stream().pipeTo(await fileSaveHandler.createWritable());
}

// await downloadInChunks(PRESIGNED_URLS, "PPGWDU_4k_video.mp4");
BUTTON_START.addEventListener("click", async () => {
  const url = URL_INPUT.value;
  const filename = FILENAME_INPUT.value;

  await downloadInChunks(url, filename);
});
