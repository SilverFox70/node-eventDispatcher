/** Apply a person revision once, in the transaction that stages its workflow. */
export async function stagePersonUpdate(tx, { personId, expectedRevision, submission }) {
  const run = await tx.stage(submission);
  if (!run.created) return run;
  const { rowCount } = await tx.query(
    'UPDATE person SET revision = revision + 1 WHERE id = $1 AND revision = $2',
    [personId, expectedRevision],
  );
  if (rowCount !== 1) throw Error('PERSON_REVISION_CONFLICT');
  return run;
}
