/** Keep visual comparisons attached to their original, independently of voice variants. */
export function visualCatalogFields(projectId, revision, output) {
  const provenance = output.visualRegeneration ?? null;
  const sourcePath = provenance?.sourcePath ?? output.path;
  const label = provenance ? provenance.variant === 1 ? 'Editorial' : 'Studio' : 'Original';
  return {
    visualLabel: label,
    visualGroupId: `${projectId}/${revision.title}/${sourcePath}`,
    originalSource: `projects/${projectId}/renders/${revision.title}/${sourcePath}`,
    visualRegeneration: provenance,
  };
}
