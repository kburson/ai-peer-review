// @story #177
// Exact async verification semantics only. This grants no production authority.
export async function verifyCleanupOwnerCore(owner, context) {
  try {
    return (await owner.verify(context)) === true;
  } catch {
    return false;
  }
}
