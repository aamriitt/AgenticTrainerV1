/**
 * Mock network delay so loading states are visible and realistic.
 * When a real backend exists, replace the `resolve(data)` call sites in
 * each service with an actual `fetch`/`axios` call — consuming hooks and
 * components do not need to change, since they only depend on the
 * exported async function signatures below.
 */
export function mockRequest<T>(data: T, delayMs = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}
