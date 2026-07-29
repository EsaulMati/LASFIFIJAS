import {
  API_TIMEOUT_MS,
  ApiError,
  apiFetch,
  isCancelledRequest,
} from '../../../web/lib/api';
import { completeLogout } from '../../../web/lib/logout';

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

  it('envía cookie y cabecera CSRF al cerrar sesión', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await apiFetch('/auth/logout', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
    });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: 'include',
    });
    const logoutHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);
    expect(logoutHeaders.get('X-CSRF-Token')).toBe('csrf-test-token');

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'renewed-csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    await apiFetch('/auth/logout', { method: 'POST' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const renewedHeaders = new Headers(fetchMock.mock.calls[3][1]?.headers);
    expect(renewedHeaders.get('X-CSRF-Token')).toBe('renewed-csrf-token');
  });

  it('no ejecuta la navegación de éxito cuando logout falla', async () => {
    const onSuccess = jest.fn();

    await expect(
      completeLogout(
        () => Promise.reject(new Error('logout failed')),
        onSuccess,
      ),
    ).rejects.toThrow('logout failed');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('ejecuta la navegación solo después de un logout exitoso', async () => {
    const onSuccess = jest.fn();

    await completeLogout(() => Promise.resolve(), onSuccess);

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
