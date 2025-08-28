import {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'
import { MCPTool } from './server.js'
import { concatVideos } from './utils.js'
import { uploadFile } from './storage.js'
import fs from 'node:fs'

export class ConcatVideoTool implements MCPTool {
  getName(): string {
    return 'concatVideo'
  }

  getDescription(): string {
    return 'Concatenate multiple videos into a single video.'
  }

  getInputSchema(): { [key: string]: unknown } {
    return {
      type: 'object',
      properties: {
        videos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The video url.',
              },
              trimStart: {
                type: 'number',
                description: 'trim start time, in seconds, default 0',
                default: 0,
              },
              trimEnd: {
                type: 'number',
                description: 'trim end time, in seconds, default 0',
                default: 0,
              },
            },
            required: ['url'],
          },
          description: 'The videos to concatenate.',
        },
      },
      required: ['videos'],
    }
  }

  async execute(request: CallToolRequest): Promise<CallToolResult> {
    const args = request.params.arguments as {
      videos: {
        url: string
        trimStart: number
        trimEnd: number
      }[]
    }

    const output = await concatVideos(args.videos)
    const url = await uploadFile(output)
    fs.unlinkSync(output)

    return {
      content: [
        {
          type: 'text',
          text: url,
        },
      ],
    }
  }
}
