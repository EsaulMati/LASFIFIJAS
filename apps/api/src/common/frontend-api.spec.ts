import {
  API_TIMEOUT_MS,
  ApiError,
  apiFetch,
  isCancelledRequest,
} from '../../../web/lib/api';

describe('frontend API request lifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('convierte un timeout en un error controlado', async () => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const request = apiFetch('/predictions');
    const expectation = expect(request).rejects.toMatchObject({
      kind: 'timeout',
      status: 0,
    });
    await jest.advanceTimersByTimeAsync(API_TIMEOUT_MS);

    await expectation;
  });

  it('distingue una cancelación para que la UI no muestre un error falso', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const controller = new AbortController();
    const request = apiFetch('/predictions', { signal: controller.signal });

    controller.abort();

    const error: unknown = await request.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(isCancelledRequest(error)).toBe(true);
  });
});
