export const slideIntents = ['title', 'agenda', 'section-divider', 'content', 'data-visualization',
  'timeline', 'process', 'quote', 'questions', 'summary', 'conclusion', 'next-steps'] as const;
export const densities = ['light', 'medium', 'heavy'] as const;
const objectTypes = ['title', 'body', 'picture', 'chart', 'table', 'diagram', 'decoration'] as const;

export interface LayoutObject {
  id: string;
  type: typeof objectTypes[number];
  sample: string;
  box: {x: number; y: number; width: number; height: number};
  clearance: number;
  themeRole: 'heading' | 'body' | 'image' | 'data' | 'accent';
}

export interface SlideRecipe {
  id: string;
  title: string;
  description: string;
  intent: typeof slideIntents[number];
  density: typeof densities[number];
  objects: LayoutObject[];
}

export interface BrandPlan {
  schemaVersion: 'a2swe-brand-plan/1';
  approvalState: 'unapproved';
  formats: ('pptx' | 'video')[];
  exemplarReference: string;
  exemplarStatus: 'not-inspected';
  selectionOrder: ['representative-sample-slides', 'layouts', 'slide-master'];
  canvas: {width: 1280; height: 720};
  safeArea: {x: 48; y: 40; width: 1184; height: 570};
  themeBindings: {
    heading: 'theme.majorFont';
    body: 'theme.minorFont';
    foreground: 'theme.text1';
    background: 'theme.background1';
    accent: 'theme.accent1';
    image: 'brand.imageStyle';
    data: 'brand.dataStyle';
  };
  overflow: 'split-or-recompose-never-shrink';
  placeholderTextIsInstruction: false;
  layouts: SlideRecipe[];
}

export function createBrandPlan(layouts: SlideRecipe[], formats: BrandPlan['formats'], exemplarReference = ''): BrandPlan {
  return {
    schemaVersion: 'a2swe-brand-plan/1', approvalState: 'unapproved', formats,
    exemplarReference: exemplarReference.trim(), exemplarStatus: 'not-inspected',
    selectionOrder: ['representative-sample-slides', 'layouts', 'slide-master'],
    canvas: {width: 1280, height: 720}, safeArea: {x: 48, y: 40, width: 1184, height: 570},
    themeBindings: {heading: 'theme.majorFont', body: 'theme.minorFont', foreground: 'theme.text1',
      background: 'theme.background1', accent: 'theme.accent1', image: 'brand.imageStyle', data: 'brand.dataStyle'},
    overflow: 'split-or-recompose-never-shrink', placeholderTextIsInstruction: false, layouts,
  };
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Brand plan: ${message}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function allowKeys(value: Record<string, unknown>, keys: string[]): void {
  for (const key of Object.keys(value)) requireValue(keys.includes(key), `unsupported field ${key}.`);
}

export function validateSlideRecipe(value: unknown): asserts value is SlideRecipe {
  requireValue(record(value), 'layout must be an object.');
  allowKeys(value, ['id', 'title', 'description', 'intent', 'density', 'objects']);
  requireValue(nonempty(value.id) && nonempty(value.title) && nonempty(value.description), 'layout identity and description are required.');
  requireValue(slideIntents.some((intent) => intent === value.intent), 'unsupported slide intent.');
  requireValue(densities.some((density) => density === value.density), 'unsupported content density.');
  requireValue(Array.isArray(value.objects) && value.objects.length > 0 && value.objects.length <= 40, 'provide 1-40 layout objects.');
  const boxes: {id: string; x: number; y: number; right: number; bottom: number}[] = [];
  let titles = 0;
  for (const object of value.objects) {
    requireValue(record(object) && nonempty(object.id) && nonempty(object.sample), 'every object needs an ID and realistic sample content.');
    allowKeys(object, ['id', 'type', 'sample', 'box', 'clearance', 'themeRole']);
    requireValue(objectTypes.some((type) => type === object.type), `unsupported placeholder type for ${object.id}.`);
    const roles: Record<string, string> = {title: 'heading', body: 'body', picture: 'image', chart: 'data', table: 'data', diagram: 'data', decoration: 'accent'};
    requireValue(object.themeRole === roles[String(object.type)], `incorrect theme role for ${object.id}.`);
    requireValue(!boxes.some((box) => box.id === object.id), `duplicate object ${object.id}.`);
    requireValue(typeof object.clearance === 'number' && Number.isFinite(object.clearance) && object.clearance >= 0, 'clearance must be a nonnegative finite number.');
    requireValue(record(object.box), `missing bounds for ${object.id}.`);
    allowKeys(object.box, ['x', 'y', 'width', 'height']);
    const {x, y, width, height} = object.box;
    requireValue(typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)
      && typeof width === 'number' && Number.isFinite(width) && width > 0
      && typeof height === 'number' && Number.isFinite(height) && height > 0, `invalid bounds for ${object.id}.`);
    const box = {id: object.id, x: x - object.clearance, y: y - object.clearance,
      right: x + width + object.clearance, bottom: y + height + object.clearance};
    requireValue(box.x >= 48 && box.y >= 40 && box.right <= 1232 && box.bottom <= 610,
      `${value.id}/${object.id} leaves the shared safe area, including its negative space.`);
    for (const other of boxes) {
      requireValue(!(box.x < other.right && box.right > other.x && box.y < other.bottom && box.bottom > other.y),
        `${value.id}/${object.id} overlaps ${other.id}, including negative space.`);
    }
    boxes.push(box);
    if (object.type === 'title') titles++;
  }
  requireValue(titles === 1, `${value.id} needs exactly one title placeholder.`);
}

export function validateBrandPlan(value: unknown): asserts value is BrandPlan {
  requireValue(record(value) && value.schemaVersion === 'a2swe-brand-plan/1', 'unsupported schema version.');
  requireValue(value.approvalState === 'unapproved' && value.exemplarStatus === 'not-inspected', 'an authoring plan cannot grant approval.');
  requireValue(Array.isArray(value.formats) && value.formats.length > 0
    && value.formats.every((format) => format === 'pptx' || format === 'video')
    && new Set(value.formats).size === value.formats.length, 'select distinct PPTX/video formats.');
  requireValue(typeof value.exemplarReference === 'string' && value.exemplarReference.length <= 2000, 'invalid exemplar reference.');
  requireValue(record(value.canvas) && value.canvas.width === 1280 && value.canvas.height === 720, 'canvas must be 1280 x 720.');
  requireValue(record(value.safeArea) && value.safeArea.x === 48 && value.safeArea.y === 40
    && value.safeArea.width === 1184 && value.safeArea.height === 570, 'shared safe area must not be overridden.');
  const expected = createBrandPlan([], ['video']);
  allowKeys(value, Object.keys(expected));
  allowKeys(value.canvas, ['width', 'height']);
  allowKeys(value.safeArea, ['x', 'y', 'width', 'height']);
  requireValue(Array.isArray(value.selectionOrder) && value.selectionOrder.length === 3
    && value.selectionOrder.every((entry, index) => entry === expected.selectionOrder[index]), 'sample slides must precede layouts and master fallback.');
  requireValue(record(value.themeBindings), 'theme bindings are required.');
  const bindings = value.themeBindings;
  requireValue(Object.keys(bindings).length === Object.keys(expected.themeBindings).length
    && Object.entries(expected.themeBindings).every(([key, role]) => bindings[key] === role), 'use shared theme bindings, not per-object overrides.');
  requireValue(value.overflow === expected.overflow && value.placeholderTextIsInstruction === false, 'preserve geometry and separate instructions from placeholder text.');
  requireValue(Array.isArray(value.layouts) && value.layouts.length > 0 && value.layouts.length <= 100, 'select at least one complete slide recipe (maximum 100).');
  const ids = new Set<string>();
  for (const layout of value.layouts) {
    validateSlideRecipe(layout);
    requireValue(!ids.has(layout.id), `duplicate layout ${layout.id}.`);
    ids.add(layout.id);
  }
}

export function brandPlanWarnings(plan: BrandPlan): string[] {
  return [
    ...(plan.exemplarReference ? ['The exemplar reference has not been opened, hashed, or approved. Inspect it before use.']
      : ['No brand exemplar supplied. Recipes are original generic samples, not official customer templates.']),
    'Bind theme colors, heading/body fonts, chart and image styles to the verified brand evidence before production.',
    'Geometry checks do not measure rendered text, motion, image crops, contrast, rights, or human approval.',
    ...densities.filter((density) => !plan.layouts.some((layout) => layout.density === density))
      .map((density) => `No ${density}-density example selected. Add one only if the scenario needs it.`),
  ];
}

export function brandInstructions(plan: BrandPlan): string {
  return `Brand template workflow (PPT and video):
- First inspect representative complete sample slides${plan.exemplarReference ? ` from ${plan.exemplarReference}` : ' from a supplied .pptx/.potx or approved brand reference; request one if needed'}. Record source SHA-256 and slide numbers. Use layout/master only as fallback.
- Selected recipes are generic authoring examples, not rendered decks or official branding: ${plan.layouts.map((layout) => `${layout.id} (${layout.intent}, ${layout.density})`).join(', ')}.
- Preserve theme color/font roles, typography hierarchy, icon/shape styles, photo composition/crops, and chart/table styles. Reuse approved voice and tone. Resolve themeBindings against the verified brand pack.
- Use title/body/picture/chart/table placeholders of the correct type in PowerPoint layouts. Placeholder text is sample content, never an instruction channel. Keep instructions outside the reusable deck.
- Check full bounds AND negative space, including decoration. Split or recompose excessive content; do not shrink fonts or resize placeholders to force it in. Review real renders for clipping.
- For video, adapt complete compositions into timed scenes, reserve subtitles/HUD/progress, and verify motion at entrances, exits, transitions, and the largest camera scale. Scale 1280 x 720 coordinates uniformly for other 16:9 outputs.
- Assets need exact source/digest, rights, attribution, placement/crop, alt text, and provenance (including generated-image origin). Logo and font rights are not inherited. Keep source metadata and C2PA where present.
- Run node scripts/check_brand_plan.ts a2swe-scenario.json from the scaffolded project, then inspect at least two slides and three video frames plus the moving pilot. This is not release approval.
- Brand kit upload/select is manual in Microsoft Copilot/PowerPoint; no upload, connector consent, licensing, or training is performed by this plan.`;
}
