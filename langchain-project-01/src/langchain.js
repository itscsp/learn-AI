/**
 * langchain.js
 *
 * Node.js reimplementation of LangChain core concepts
 * powered by xAI Grok (OpenAI-compatible API):
 *  - LLM wrapper
 *  - PromptTemplate
 *  - LLMChain
 *  - SequentialChain
 *  - ConversationBufferMemory / ConversationBufferWindowMemory
 *  - ConversationChain
 */

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// 1. LLM  (mirrors langchain.llms.OpenAI — now backed by Grok)
// ---------------------------------------------------------------------------
export class LLM {
  /**
   * @param {object} options
   * @param {number} [options.temperature=0.7]  0 = deterministic, 1 = creative
   * @param {string} [options.model]            Grok model to use
   */
  constructor({
    temperature = 0.7,
    model = "llama-3.1-8b-instant", // Meta Llama 3.1 8B - fast and reliable
  } = {}) {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1", // Correct OpenAI-compatible endpoint for Groq
    });
    this.temperature = temperature;
    this.model = model;
  }

  /** Send a plain string prompt and return the text response. */
  async predict(prompt) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      temperature: this.temperature,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message.content;
  }
}

// ---------------------------------------------------------------------------
// 2. PromptTemplate  (mirrors langchain.prompts.PromptTemplate)
// ---------------------------------------------------------------------------
export class PromptTemplate {
  /**
   * @param {object} options
   * @param {string[]} options.inputVariables  e.g. ['cuisine']
   * @param {string}   options.template        e.g. "Suggest a name for {cuisine} food"
   */
  constructor({ inputVariables, template }) {
    this.inputVariables = inputVariables;
    this.template = template;
  }

  /** Substitute variables and return the formatted prompt string. */
  format(values) {
    let result = this.template;
    for (const key of this.inputVariables) {
      result = result.replaceAll(`{${key}}`, values[key] ?? "");
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// 3. LLMChain  (mirrors langchain.chains.LLMChain)
// ---------------------------------------------------------------------------
export class LLMChain {
  /**
   * @param {object} options
   * @param {LLM}            options.llm
   * @param {PromptTemplate} options.prompt
   * @param {string}         [options.outputKey='text']
   * @param {object}         [options.memory]
   */
  constructor({ llm, prompt, outputKey = "text", memory = null }) {
    this.llm = llm;
    this.prompt = prompt;
    this.outputKey = outputKey;
    this.memory = memory;
  }

  /**
   * Run the chain with a plain string or an object of variables.
   * Returns just the text string (mirrors chain.run()).
   */
  async run(input) {
    const values =
      typeof input === "string"
        ? { [this.prompt.inputVariables[0]]: input }
        : input;

    const formatted = this.prompt.format(values);
    const result = await this.llm.predict(formatted);

    if (this.memory) {
      this.memory.saveContext(
        { input: typeof input === "string" ? input : JSON.stringify(input) },
        { output: result }
      );
    }

    return result;
  }

  /**
   * Run with an object of inputs and return { [outputKey]: result }.
   * Used internally by SequentialChain.
   */
  async call(inputValues) {
    const formatted = this.prompt.format(inputValues);
    const result = await this.llm.predict(formatted);
    return { [this.outputKey]: result };
  }
}

// ---------------------------------------------------------------------------
// 4. SequentialChain  (mirrors langchain.chains.SequentialChain)
//    Runs a list of LLMChains in order, piping outputs into the next chain.
// ---------------------------------------------------------------------------
export class SequentialChain {
  /**
   * @param {object}     options
   * @param {LLMChain[]} options.chains
   * @param {string[]}   options.inputVariables   initial inputs
   * @param {string[]}   options.outputVariables  keys to collect at the end
   */
  constructor({ chains, inputVariables, outputVariables }) {
    this.chains = chains;
    this.inputVariables = inputVariables;
    this.outputVariables = outputVariables;
  }

  /** Execute all chains sequentially and return the requested output variables. */
  async call(inputs) {
    let context = { ...inputs };

    for (const chain of this.chains) {
      const result = await chain.call(context);
      context = { ...context, ...result };
    }

    const output = {};
    for (const key of this.outputVariables) {
      output[key] = context[key];
    }
    return output;
  }
}

// ---------------------------------------------------------------------------
// 5. Memory implementations
// ---------------------------------------------------------------------------

/**
 * ConversationBufferMemory — keeps ALL messages forever.
 * Mirrors langchain.memory.ConversationBufferMemory
 */
export class ConversationBufferMemory {
  constructor() {
    this.buffer = "";     // human-readable log
    this.messages = [];   // structured [{role, content}]
  }

  saveContext({ input }, { output }) {
    this.buffer += `Human: ${input}\nAI: ${output}\n`;
    this.messages.push({ role: "user", content: input });
    this.messages.push({ role: "assistant", content: output });
  }

  loadMemoryVariables() {
    return { history: this.buffer };
  }
}

/**
 * ConversationBufferWindowMemory — keeps only the last k exchanges.
 * Mirrors langchain.memory.ConversationBufferWindowMemory
 */
export class ConversationBufferWindowMemory {
  /**
   * @param {object} options
   * @param {number} [options.k=5]  number of recent exchanges to keep
   */
  constructor({ k = 5 } = {}) {
    this.k = k;
    this.exchanges = [];
  }

  saveContext({ input }, { output }) {
    this.exchanges.push({ human: input, ai: output });
    if (this.exchanges.length > this.k) {
      this.exchanges.shift();
    }
  }

  get buffer() {
    return this.exchanges
      .map((e) => `Human: ${e.human}\nAI: ${e.ai}`)
      .join("\n");
  }

  loadMemoryVariables() {
    return { history: this.buffer };
  }

  /** Returns messages array for direct use in the OpenAI-compatible API. */
  get messages() {
    return this.exchanges.flatMap((e) => [
      { role: "user", content: e.human },
      { role: "assistant", content: e.ai },
    ]);
  }
}

// ---------------------------------------------------------------------------
// 6. ConversationChain  (mirrors langchain.chains.ConversationChain)
//    Stateful chat with automatic memory injection.
// ---------------------------------------------------------------------------
export class ConversationChain {
  /**
   * @param {object} options
   * @param {LLM}    options.llm
   * @param {ConversationBufferMemory|ConversationBufferWindowMemory} [options.memory]
   */
  constructor({ llm, memory = null }) {
    this.llm = llm;
    this.memory = memory ?? new ConversationBufferMemory();
  }

  /** Chat with Grok, automatically keeping conversation history. */
  async run(userInput) {
    const messages = [
      ...this.memory.messages,
      { role: "user", content: userInput },
    ];

    const response = await this.llm.client.chat.completions.create({
      model: this.llm.model,
      max_tokens: 1024,
      temperature: this.llm.temperature,
      messages,
    });

    const aiResponse = response.choices[0].message.content;
    this.memory.saveContext({ input: userInput }, { output: aiResponse });
    return aiResponse;
  }
}
