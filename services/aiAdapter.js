const Replicate = require('replicate');
const { OpenAI, toFile } = require('openai');

const STYLE_PROMPTS = {
  cartoon:
    'Transform this image into a cartoon clipart style with bold black outlines, vibrant saturated colors, simplified shapes, and a clean white background. Keep the same subject, pose, and composition as the original.',
  flat:
    'Transform this image into a flat illustration clipart style with geometric shapes, minimal shadows, solid colors, clean edges, and a clean white background. Keep the same subject, pose, and composition as the original.',
  anime:
    'Transform this image into an anime/manga clipart style with characteristic large expressive features, clean line art, cel-shading, vibrant colors, and a clean white background. Keep the same subject, pose, and composition as the original.',
  pixel:
    'Transform this image into pixel art clipart style with a visible pixel grid, limited color palette, retro 16-bit aesthetic, crisp edges, and a clean white background. Keep the same subject, pose, and composition as the original.',
  sketch:
    'Transform this image into a pencil sketch clipart style with clean ink outlines, cross-hatching for shading, minimal color, hand-drawn aesthetic, and a clean white background. Keep the same subject, pose, and composition as the original.',
};

const STYLE_DENOISING = {
  cartoon: 0.65,
  flat: 0.65,
  anime: 0.6,
  pixel: 0.7,
  sketch: 0.6,
};

function extensionForMime(mimeType) {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
}

function createOpenAIAdapter() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';

  console.log(`[Adapter] creating OpenAI adapter, key present: ${!!apiKey}, model: ${model}`);

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  const client = new OpenAI({ apiKey });

  return {
    async generate(base64Image, styleId, mimeType = 'image/jpeg') {
      const prompt = STYLE_PROMPTS[styleId];
      if (!prompt) throw new Error(`Unknown style: ${styleId}`);

      console.log(`[Adapter] OpenAI edit style: ${styleId}, mime: ${mimeType}`);
      console.log(`[Adapter] base64 length: ${base64Image?.length}`);

      const buf = Buffer.from(base64Image, 'base64');
      const ext = extensionForMime(mimeType);
      const imageFile = await toFile(buf, `input.${ext}`, { type: mimeType });

      const result = await client.images.edit({
        model,
        image: imageFile,
        prompt,
        input_fidelity: 'high',
        size: '1024x1024',
        quality: 'medium',
        output_format: 'jpeg',
      });

      const first = result.data?.[0];
      const b64 = first?.b64_json;
      if (!b64) {
        console.error('[Adapter] OpenAI response:', JSON.stringify(result).slice(0, 500));
        throw new Error('OpenAI returned no image (missing b64_json).');
      }

      const imageUrl = `data:image/jpeg;base64,${b64}`;
      console.log(`[Adapter] OpenAI success, data URL length: ${imageUrl.length}`);
      return { imageUrl };
    },
  };
}

function createReplicateAdapter() {
  const token = process.env.REPLICATE_API_TOKEN;
  console.log(`[Adapter] creating Replicate adapter, token present: ${!!token}`);
  const replicate = new Replicate({ auth: token });

  return {
    async generate(base64Image, styleId, mimeType = 'image/jpeg') {
      const prompt = STYLE_PROMPTS[styleId];
      if (!prompt) throw new Error(`Unknown style: ${styleId}`);

      const denoising = STYLE_DENOISING[styleId] || 0.65;

      console.log(`[Adapter] style: ${styleId}, denoising: ${denoising}`);
      console.log(`[Adapter] base64 length: ${base64Image?.length}, mime: ${mimeType}`);

      const imageDataUri = `data:${mimeType};base64,${base64Image}`;

      console.log('[Adapter] calling bxclib2/flux_img2img with positive_prompt');
      const output = await replicate.run(
        'bxclib2/flux_img2img:0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5',
        {
          input: {
            image: imageDataUri,
            positive_prompt: prompt,
            denoising: denoising,
            steps: 24,
            seed: 0,
          },
        }
      );

      console.log(`[Adapter] output type: ${typeof output}, constructor: ${output?.constructor?.name}`);
      console.log(`[Adapter] output toString: ${String(output)?.substring(0, 200)}`);

      let imageUrl;
      if (typeof output === 'string') {
        imageUrl = output;
      } else if (output?.url && typeof output.url === 'function') {
        imageUrl = output.url();
      } else if (output?.url && typeof output.url === 'string') {
        imageUrl = output.url;
      } else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        imageUrl = typeof first === 'string' ? first : first?.url?.() || first?.url || String(first);
      } else {
        imageUrl = String(output);
      }

      console.log(`[Adapter] resolved imageUrl: ${typeof imageUrl === 'string' ? imageUrl.substring(0, 200) : imageUrl}`);
      return { imageUrl };
    },
  };
}

function createAdapter() {
  const provider = (process.env.AI_PROVIDER || 'replicate').toLowerCase();
  console.log(`[Adapter] provider: ${provider}`);

  switch (provider) {
    case 'openai':
      return createOpenAIAdapter();
    case 'replicate':
      return createReplicateAdapter();
    default:
      throw new Error(`Unknown AI provider: ${provider}. Use "openai" or "replicate".`);
  }
}

module.exports = { createAdapter };
