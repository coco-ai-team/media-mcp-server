import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z, ZodError } from 'zod'
import { jsonSchemaToZod } from 'json-schema-to-zod'

export interface MCPTool {
  /**
   * Gets the name of the tool
   * @returns {string} The tool name
   */
  getName(): string

  /**
   * Gets the description of the tool
   * @returns {string} The tool description
   */
  getDescription(): string

  /**
   * Gets the input JSON schema for the tool
   * @returns {Object} The input schema object
   * @example
   * ```json
   * {
   *   "type": "object",
   *   "properties": {
   *     "taskId": { "type": "string" }
   *   }
   * }
   * ```
   */
  getInputSchema(): { [key: string]: unknown }

  /**
   * Executes the tool with the given arguments
   * @param {CallToolRequest} request - The request for the tool
   * @returns {Promise<CallToolResult>} The result of the tool execution
   * @throws {Error} If the tool execution fails
   */
  execute(request: CallToolRequest): Promise<CallToolResult>
}

export default class MCPServer extends Server {
  tools: MCPTool[]

  constructor(
    options: {
      name: string
      version: string
    },
    tools: MCPTool[],
  ) {
    super(
      { name: options.name, version: options.version },
      { capabilities: { tools: {} } },
    )
    this.tools = tools
    this.initialize()
  }

  initialize() {
    this.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map((tool) => ({
          name: tool.getName(),
          description: tool.getDescription(),
          inputSchema: tool.getInputSchema(),
        })),
      }
    })

    this.setRequestHandler(CallToolRequestSchema, async (request) => {
      return this.callTool(request)
    })
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    const tool = this.tools.find(
      (tool) => tool.getName() === request.params.name,
    )
    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Unknown tool requested: ${request.params.name}`,
          },
        ],
      }
    }

    try {
      this.validateInput(tool, request)
      return tool.execute(request)
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
      }
    }
  }

  validateInput(tool: MCPTool, request: CallToolRequest) {
    try {
      this.getZodSchemaFromJsonSchema(tool.getInputSchema()).parse(
        request.params.arguments,
      )
    } catch (error) {
      let message = ''
      if (error instanceof ZodError) {
        message = `Invalid arguments for tool ${tool.getName()}: ${error.errors
          .map((e) => `${e.path.join('.')} (${e.code}): ${e.message}`)
          .join(', ')}`
      } else {
        message = error instanceof Error ? error.message : String(error)
      }
      throw new Error(message)
    }
  }

  getZodSchemaFromJsonSchema(jsonSchema: any): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) {
      return z.object({}).passthrough()
    }

    try {
      const zodSchemaString = jsonSchemaToZod(jsonSchema)
      const zodSchema = eval(zodSchemaString)
      if (typeof zodSchema?.parse !== 'function') {
        throw new Error('Eval did not produce a valid Zod schema.')
      }
      return zodSchema as z.ZodTypeAny
    } catch (err: any) {
      return z.object({}).passthrough()
    }
  }
}
