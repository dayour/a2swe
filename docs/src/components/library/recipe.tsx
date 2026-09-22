import type {SlideRecipe} from '../../../../template/scripts/brand-plan';

function previewLines(text: string, capacity: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const index = lines.length - 1;
    if (index < 0 || lines[index].length + word.length + 1 > capacity) lines.push(word);
    else lines[index] += ` ${word}`;
  }
  return lines;
}

export function RecipePreview({recipe}: {recipe: SlideRecipe}) {
  return <figure className="library-recipe">
    <svg viewBox="0 0 1280 720" role="img" aria-label={`${recipe.title}: ${recipe.intent}, ${recipe.density} density; schematic placeholder layout`}>
      <rect className="library-recipe-safe" x="48" y="40" width="1184" height="570" />
      {recipe.objects.map((object) => {
        const {x, y, width, height} = object.box;
        return <g key={object.id}>
          <rect x={x} y={y} width={width} height={height} rx="4" />
          {height >= 100 && <text x={x + 14} y={y + 22}>{object.type.toUpperCase()}</text>}
          <text className="library-recipe-sample" x={x + 14} y={y + (height >= 100 ? 72 : 36)}>
            {previewLines(object.sample, Math.floor((width - 28) / 17)).map((line, index) =>
              <tspan key={index} x={x + 14} dy={index ? 34 : 0}>{line}</tspan>)}
          </text>
        </g>;
      })}
      <text className="library-recipe-reserved" x="64" y="677">VIDEO: SUBTITLES / PROGRESS RESERVED</text>
    </svg>
    <figcaption>Schematic recipe, not a rendered slide or approved brand template.</figcaption>
  </figure>;
}
