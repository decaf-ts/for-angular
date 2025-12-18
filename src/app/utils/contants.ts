import { IMenuItem } from "src/lib/engine/interfaces";

export const DashboardMenuItem =  {
  label: 'Dashboard',
  icon: 'apps-outline',
  url: '/dashboard',
};

export const LogoutMenuItem =   {
  label: 'Logout',
  title: 'Login',
  icon: 'log-out-outline',
  url: '/login',
  color: 'danger'
};

export const AppMenu: IMenuItem[] = [
  {
    label: 'Crud',
    icon: 'save-outline',
  },
  {
    label: 'Read',
    url: '/crud/read',
  },
  {
    label: 'Create / Update',
    url: '/crud/create',
  },
  {
    label: 'Delete',
    url: '/crud/delete',
  },
   {
    label: 'Fieldset',
    url: '/fieldset',
  },
  {
    label: 'Steps Form',
    url: '/steps-form',
  },
  {
    label: 'Model Lists',
    icon: 'list-outline',
  },
  {
    label: 'AI Models (Infinite)',
    url: '/list-model/infinite',
  },
  {
    label: 'AI Vendors (Paginated)',
    url: '/list-model/paginated',
  },
];

export const EwMenu: IMenuItem[] = [
  {
    label: 'menu.product_management',
  },
  {
    label: 'Products',
    url: 'products',
    icon: 'ti-medicine-syrup',
  },
  {
    label: 'Batches',
    url: 'batches',
    icon: 'ti-package',
  },
  {
    label: 'Leaflets',
    url: 'leaflets',
    icon: 'ti-file-barcode',
  },
];




/**
 * @description Supported AI vendors/providers
 * @summary Identifiers for external AI service providers available in the system, used to map models and capabilities.
 * @enum {string}
 * @readonly
 * @memberOf module:the-alfred-shared
 */
export enum AIVendors {
  /** Google AI/Vertex provider */
  GOOGLE = "google",
  /** OpenAI provider (GPT family) */
  OPEN_AI = "openai",
  /** Anthropic provider (Claude family) */
  ANTHROPIC = "anthropic",
  /** Perplexity provider */
  PERPLEXITY = "perplexity",
  /** Midjourney image generation provider */
  MIDJOURNEY = "midjourney",
  /** Runway video/creative provider */
  RUNWAY = "runway",
  /** Ollama local model runtime */
  OLLAMA = "ollama",
  /** Ollama local model runtime */
  MISTRAL = "mistralai",
}


/**
 * @description Supported AI feature capabilities
 * @summary Enumerates the capabilities that AI models may provide, used for matching prompts to model abilities and for capability discovery.
 * @enum {string}
 * @readonly
 * @memberOf module:the-alfred-shared
 */
export enum AIFeatures {
  /** Summarization of text content */
  PERSONAL_IDENTIFIERS = "personal-identifiers",
  /** Summarization of text content */
  SUMMARIZATION = "summarization",
  /** Context building or contextualization from inputs */
  CONTEXTUALIZATION = "contextualization",
  /** Keyword extraction capability */
  KEYWORDS = "keywords",
  /** Re-ranking of results based on relevance */
  RERANKING = "reranking",
  /** Convert text to speech (TTS) */
  TEXT_TO_SPEECH = "text-to-speech",
  /** Convert speech to text (ASR) */
  SPEECH_TO_TEXT = "speech-to-text",
  /** Extract text from images (OCR) */
  IMAGE_TO_TEXT = "image-to-text",
  /** Generate images from text prompts */
  TEXT_TO_IMAGE = "text-to-image",
  /** Generate videos from text prompts */
  TEXT_TO_VIDEO = "text-to-video",
  /** Understand images and output text */
  VISION_TO_TEXT = "vision-to-text",
  /** Recognize objects in visual inputs */
  OBJECT_RECOGNITION = "object-recognition",
  /** Advanced reasoning tasks */
  REASONING = "reasoning",
  /** Question answering over provided context */
  QUESTION_ANSWERING = "question-answering",
  /** Conversational chat capability */
  CHAT = "chat",
  /** Translation between languages */
  TRANSLATION = "translation",
  /** Planning tasks and steps */
  PLANNING = "planning",
  /** Research-oriented tasks */
  RESEARCH = "research",
  /** Long-horizon or deep research */
  DEEP_RESEARCH = "deep-research",
  /** Tool usage or function calling */
  TOOL_USAGE = "tool-usage",
  /** Code generation or assistance */
  CODING = "coding",
  /** Lightweight/fast variant */
  LIGHTWEIGHT = "lightweight",
  /** Heavyweight/high-capability variant */
  HEAVYWEIGHT = "heavyweight",
}
