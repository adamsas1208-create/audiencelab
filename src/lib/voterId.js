// A stable, anonymous voter id kept in localStorage so repeat votes from the
// same browser are attributable (and blockable via a DB unique constraint)
// without collecting any PII or requiring an account.
export function getVoterId() {
  const KEY = 'al_voter_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
