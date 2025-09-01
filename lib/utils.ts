import fs from 'node:fs'
import path from 'node:path'
import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import os from 'node:os'
import { randomUUID } from 'node:crypto'

import ffmpegStatic from 'ffmpeg-ffprobe-static'
ffmpeg.setFfmpegPath(ffmpegStatic.ffmpegPath as string)
ffmpeg.setFfprobePath(ffmpegStatic.ffprobePath as string)

export async function concatVideos(
  input: {
    url: string
    trimStart: number
    trimEnd: number
  }[],
): Promise<string> {
  let files: string[] = []
  let trimmedFiles: string[] = []
  let output: string = ''

  try {
    files = await Promise.all(
      input.map(async (video) => await downloadFile(video.url)),
    )

    const trimmedFiles: string[] = []
    for (let i = 0; i < files.length; i++) {
      const trimmedFile = await trimVideo({
        input: files[i],
        trimStart: input[i].trimStart,
        trimEnd: input[i].trimEnd,
      })
      trimmedFiles.push(trimmedFile)
    }

    output = await _concatVideos(trimmedFiles)
    return output
  } catch (err) {
    throw err
  } finally {
    files.forEach(fs.unlinkSync)
    trimmedFiles.forEach(fs.unlinkSync)
  }
}

export async function downloadFile(url: string): Promise<string> {
  const tempFilePath = getTempName('.mp4')
  const writer = fs.createWriteStream(tempFilePath)

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 60 * 1000,
    })

    response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true))
      writer.on('error', (err) => reject(err))
    })

    return tempFilePath
  } catch (err) {
    writer.destroy()
    throw new Error(`Failed to download ${url}, ${err}`)
  }
}

function getVideoDuration(filepath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        reject(
          new Error(
            `Failed to get video duration, filepath=${filepath}, err=${err}`,
          ),
        )
      } else {
        resolve(metadata.format.duration as number)
      }
    })
  })
}

function getTempName(ext: string): string {
  return path.join(os.tmpdir(), `${randomUUID()}${ext}`)
}

function trimVideo({
  input,
  trimStart,
  trimEnd,
}: {
  input: string
  trimStart: number
  trimEnd: number
}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const duration = await getVideoDuration(input)
    const startTime = trimStart
    const endTime = duration - trimEnd

    // if the trimmed duration is less than 0, set it to the duration of the video (no trim)
    let trimmedDuration = endTime - startTime
    if (trimmedDuration <= 0) {
      trimmedDuration = duration
    }

    const output = getTempName('.mp4')

    ffmpeg(input)
      .seekInput(startTime)
      .duration(trimmedDuration)
      .outputOption([
        '-threads 1',           // 限制线程数为1
        '-preset ultrafast',    // 使用最快预设，降低CPU使用
        '-crf 23',             // 合理的质量，平衡文件大小和质量
        '-movflags +faststart', // 优化播放
        '-avoid_negative_ts make_zero', // 避免负时间戳
      ])
      .output(output)
      .on('end', () => {
        resolve(output)
      })
      .on('error', (err) => {
        reject(
          new Error(
            `Failed to trim video, input=${input}, trimStart=${trimStart}, trimEnd=${trimEnd}, err=${err}`,
          ),
        )
      })
      .run()
  })
}

async function _concatVideos(inputs: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempFile = getTempName('.mp4')
    fs.writeFileSync(
      tempFile,
      inputs.map((file) => `file '${file}'`).join('\n'),
    )

    const output = getTempName('.mp4')

    ffmpeg()
      .input(tempFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .output(output)
      .on('end', () => {
        fs.unlinkSync(tempFile)
        resolve(output)
      })
      .on('error', (err) => {
        fs.unlinkSync(tempFile)
        reject(
          new Error(
            `Failed to concat videos, inputs=${JSON.stringify(inputs)}, err=${err}`,
          ),
        )
      })
      .run()
  })
}
