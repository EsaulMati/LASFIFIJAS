export async function completeLogout(
  requestLogout: () => Promise<unknown>,
  onSuccess: () => void,
) {
  await requestLogout();
  onSuccess();
}
