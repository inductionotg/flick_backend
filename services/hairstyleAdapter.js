const { OpenAI, toFile } = require('openai');

let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch {
  GoogleGenerativeAI = null;
}

const HAIRSTYLE_PROMPTS = {
  buzz_cut: {
    prompt: 'Replace only the hairstyle with an ultra-short buzz cut achieved with hair clippers. The top should be around 15mm (like a #6 clipper guard), the sides around 12mm (#4 guard), and the edges trimmed to about 6mm (#2 guard). The hair must be evenly clipped very close to the scalp with a clean, sharp, minimal look. The defining feature is precise, sharp lines around the edges — the hairline, temples, sideburns, and neckline should all have crisp, well-defined trim lines. Preserve the exact face, skin tone, beard, eyebrows, ears, expression, and all facial details. Do not alter the background, pose, or clothing.',
    examples: [
      'military buzz cut with very short even length all around and sharp edge lines',
      'clean number 1 buzz cut close to the scalp with precise temple edges',
      'slightly textured buzz cut with subtle hairline definition and tapered sides',
      'modern buzz cut with sharp edges around the temples and clean neckline',
      'ultra-short buzz cut with smooth finish and crisp sideburn lines',
      'classic 6-4-2 buzz cut with longer top and shorter tapered sides',
    ],
  },
  fade: {
    prompt: 'Replace only the hairstyle with a clean fade haircut. The sides should gradually taper from longer hair on top down to very short or skin fade near the ears and neckline. Keep the face completely unchanged.',
    examples: [
      'low fade with short textured top',
      'mid fade with volume on top',
      'high skin fade with sharp line-up',
      'drop fade with curly top',
      'taper fade with natural sideburns',
      'burst fade around the ears',
      'fade haircut with slicked top',
    ],
  },
  undercut: {
    prompt: 'Replace only the hairstyle with an undercut. The sides and back should be very short or shaved while the top remains significantly longer. Preserve the original face and identity exactly.',
    examples: [
      'classic undercut with long top',
      'short undercut with messy textured top',
      'slick undercut with combed-back hair',
      'modern disconnected undercut',
      'undercut with side-swept top',
      'undercut with wavy top hair',
    ],
  },
  pompadour: {
    prompt: 'Replace only the hairstyle with a pompadour. The hair should have volume at the front, swept upward and backward with a polished finish. Keep the face exactly the same.',
    examples: [
      'classic pompadour with smooth sides',
      'high-volume pompadour with fade',
      'modern pompadour with textured top',
      'short pompadour with clean taper',
      'slick pompadour with shiny finish',
      'retro pompadour inspired by vintage styles',
    ],
  },
  curly_hair: {
    prompt: 'Replace only the hairstyle with natural curly hair. The curls should look realistic, soft, and well-defined while preserving the original face exactly.',
    examples: [
      'short tight curls with volume',
      'medium curly hairstyle with natural bounce',
      'long curly hair with soft ringlets',
      'messy curly hairstyle with layered curls',
      'thick curly hair with natural texture',
      'curly fade hairstyle with defined curls on top',
    ],
  },
  long_wavy_hair: {
    prompt: 'Replace only the hairstyle with long wavy hair flowing naturally past the shoulders. Keep the face untouched.',
    examples: [
      'long beach waves with soft texture',
      'loose wavy hair with middle part',
      'shoulder-length wavy hairstyle',
      'long layered wavy hair',
      'thick wavy hair with volume',
      'soft flowing waves with side part',
    ],
  },
  ponytail: {
    prompt: 'Replace only the hairstyle with a neat ponytail tied at the back of the head. Preserve the exact face and all facial details.',
    examples: [
      'high ponytail with smooth finish',
      'low ponytail tied at the nape',
      'messy ponytail with loose strands',
      'sleek ponytail with straight hair',
      'curly ponytail with volume',
      'long ponytail with center part',
    ],
  },
  bun: {
    prompt: 'Replace only the hairstyle with a bun. The hair should be gathered neatly into a bun while keeping the face identical.',
    examples: [
      'high top bun with sleek sides',
      'low bun tied at the back',
      'messy bun with loose strands',
      'tight ballerina bun',
      'man bun with longer hair',
      'curly bun with natural texture',
    ],
  },
  bob_cut: {
    prompt: 'Replace only the hairstyle with a classic bob cut ending around jaw length. Preserve the exact facial identity.',
    examples: [
      'short blunt bob cut',
      'layered bob with volume',
      'straight bob with sharp edges',
      'curly bob hairstyle',
      'side-parted bob cut',
      'chin-length bob with bangs',
    ],
  },
  pixie_cut: {
    prompt: 'Replace only the hairstyle with a pixie cut. The sides should be short with slightly longer textured hair on top.',
    examples: [
      'classic pixie cut with soft texture',
      'short pixie with side-swept bangs',
      'messy pixie cut with volume',
      'undercut pixie hairstyle',
      'layered pixie cut',
      'sleek pixie with clean finish',
    ],
  },
  layered_hair: {
    prompt: 'Replace only the hairstyle with medium-length layered hair. The layers should create movement and texture while preserving the face exactly.',
    examples: [
      'soft layered shoulder-length hair',
      'long layered hairstyle with volume',
      'layered haircut with curtain bangs',
      'messy layered hairstyle',
      'feathered layered haircut',
      'medium layered hair with side part',
    ],
  },
  straight_hair: {
    prompt: 'Replace only the hairstyle with smooth straight hair. Keep the face and identity unchanged.',
    examples: [
      'long sleek straight hair',
      'shoulder-length straight hairstyle',
      'straight hair with center part',
      'straight layered hair with shine',
      'blunt straight hairstyle',
      'straight hair tucked behind ears',
    ],
  },
  dreadlocks: {
    prompt: 'Replace only the hairstyle with realistic dreadlocks. Preserve the face exactly.',
    examples: [
      'short dreadlocks with fade',
      'long dreadlocks past shoulders',
      'thick mature dreadlocks',
      'neat tied-back dreadlocks',
      'high-top dreadlocks',
      'messy freeform dreadlocks',
    ],
  },
  braids: {
    prompt: 'Replace only the hairstyle with detailed braided hair. Keep the face untouched.',
    examples: [
      'box braids with long length',
      'cornrows braided close to the scalp',
      'French braids with neat detail',
      'double braids tied back',
      'braided ponytail hairstyle',
      'thick symmetrical braids',
    ],
  },
  mohawk: {
    prompt: 'Replace only the hairstyle with a mohawk. The sides should be shaved while a strip of hair remains in the center.',
    examples: [
      'classic tall mohawk',
      'short mohawk with fade',
      'curly mohawk hairstyle',
      'spiky mohawk with sharp texture',
      'modern mohawk with taper sides',
      'messy mohawk with volume',
    ],
  },
  side_part: {
    prompt: 'Replace only the hairstyle with a classic side part. The hair should be neatly combed to one side with a defined part line.',
    examples: [
      'clean side part with taper fade',
      'side-parted hairstyle with volume',
      'slick side part with shiny finish',
      'short side part with textured top',
      'classic gentleman side part',
      'modern side part with low fade',
    ],
  },
  slick_back: {
    prompt: 'Replace only the hairstyle with slicked-back hair. The hair should be combed smoothly backward from the forehead.',
    examples: [
      'classic slick back with shine',
      'slick back with undercut',
      'short slicked hairstyle',
      'slick back with fade sides',
      'wet-look slick hairstyle',
      'textured slick back with volume',
    ],
  },
  afro: {
    prompt: 'Replace only the hairstyle with a full rounded afro. Preserve the exact face and identity.',
    examples: [
      'short rounded afro',
      'large voluminous afro',
      'natural textured afro',
      'afro with taper fade sides',
      'soft curly afro hairstyle',
      'defined afro with shape-up',
    ],
  },
  fringe: {
    prompt: 'Replace only the hairstyle with a hairstyle that includes prominent bangs or fringe across the forehead.',
    examples: [
      'straight fringe with shoulder-length hair',
      'curtain bangs with layered hair',
      'short fringe with pixie cut',
      'side-swept fringe hairstyle',
      'thick blunt bangs',
      'messy fringe with textured haircut',
    ],
  },
  wolf_cut: {
    prompt: 'Replace only the hairstyle with a shaggy wolf cut featuring heavy layers and textured ends.',
    examples: [
      'short wolf cut with messy layers',
      'medium wolf cut with curtain bangs',
      'long wolf cut with volume',
      'wolf cut with soft curls',
      'textured wolf cut with choppy layers',
      'modern Korean-inspired wolf cut',
    ],
  },
  korean_style: {
    prompt: 'Replace only the hairstyle with a Korean-style haircut featuring soft layers, airy texture, and curtain bangs.',
    examples: [
      'soft Korean layered haircut',
      'Korean curtain bangs hairstyle',
      'two-block Korean haircut',
      'Korean short hairstyle with volume',
      'airy Korean hairstyle with side part',
      'textured Korean haircut with soft layers',
    ],
  },
  man_bun: {
    prompt: 'Replace only the hairstyle with a man bun. The hair should be tied up neatly while preserving the exact face.',
    examples: [
      'classic man bun tied at the crown',
      'low man bun with loose strands',
      'undercut with man bun',
      'messy man bun hairstyle',
      'long hair tied into man bun',
      'half-up man bun hairstyle',
    ],
  },
};

const FACE_PRESERVATION_RULE =
  'Important: Do not change the person\'s face in any way. ' +
  'Keep the exact same: facial structure, skin tone, eyes, eyebrows, nose, lips, ears, ' +
  'beard, makeup, facial expression, wrinkles, jawline, identity, lighting, pose, background. ' +
  'Only replace the hairstyle. The final image must look realistic and maintain the same person exactly as uploaded.';

function buildHairstylePrompt(hairstyleId) {
  const entry = HAIRSTYLE_PROMPTS[hairstyleId];
  if (!entry) throw new Error(`Unknown hairstyle: ${hairstyleId}`);

  const example = entry.examples[Math.floor(Math.random() * entry.examples.length)];

  return (
    entry.prompt +
    ` Style variation: ${example}.` +
    ' ' + FACE_PRESERVATION_RULE
  );
}

function extensionForMime(mimeType) {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg';
}

// ── OpenAI adapter (uses images.edit, same SDK already in the project) ──

function createOpenAIHairstyleAdapter() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when HAIRSTYLE_PROVIDER=openai');
  }

  const client = new OpenAI({ apiKey });

  return {
    async generate(base64Image, hairstyleId, mimeType = 'image/jpeg') {
      const prompt = buildHairstylePrompt(hairstyleId);

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
        throw new Error('OpenAI returned no image (missing b64_json).');
      }

      return { imageUrl: `data:image/jpeg;base64,${b64}` };
    },
  };
}

// ── Gemini adapter (optional, for when GEMINI_API_KEY is configured) ──

function createGeminiHairstyleAdapter() {
  if (!GoogleGenerativeAI) {
    throw new Error(
      '@google/generative-ai is not installed. Run: npm i @google/generative-ai'
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required when HAIRSTYLE_PROVIDER=gemini');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseModalities: ['image', 'text'] },
  });

  return {
    async generate(base64Image, hairstyleId, mimeType = 'image/jpeg') {
      const prompt = buildHairstylePrompt(hairstyleId);

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Image, mimeType } },
      ]);

      const parts = result.response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error('Gemini returned no content.');
      }

      const imageParts = parts.filter((p) => p.inlineData);
      if (imageParts.length === 0) {
        throw new Error('Gemini returned no image in response.');
      }

      const generated = imageParts[0].inlineData;
      return {
        imageUrl: `data:${generated.mimeType || 'image/png'};base64,${generated.data}`,
      };
    },
  };
}

// ── Factory: picks provider based on HAIRSTYLE_PROVIDER env var ──

function createHairstyleAdapter() {
  const provider = (process.env.HAIRSTYLE_PROVIDER || 'openai').toLowerCase();

  switch (provider) {
    case 'openai':
      return createOpenAIHairstyleAdapter();
    case 'gemini':
      return createGeminiHairstyleAdapter();
    default:
      throw new Error(
        `Unknown HAIRSTYLE_PROVIDER: ${provider}. Use "openai" or "gemini".`
      );
  }
}

const VALID_HAIRSTYLES = Object.keys(HAIRSTYLE_PROMPTS);

module.exports = { createHairstyleAdapter, VALID_HAIRSTYLES };
