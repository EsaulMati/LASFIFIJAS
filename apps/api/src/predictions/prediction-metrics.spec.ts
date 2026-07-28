import { calculateAccuracy } from '../../../web/lib/prediction-metrics';

describe('prediction accuracy', () => {
  it('excluye PENDING y VOID del denominador', () => {
    expect(
      calculateAccuracy([
        { status: 'WON' },
        { status: 'LOST' },
        { status: 'PENDING' },
        { status: 'VOID' },
      ]),
    ).toBe(50);
  });

  it('controla la división entre cero', () => {
    expect(
      calculateAccuracy([{ status: 'PENDING' }, { status: 'VOID' }]),
    ).toBeNull();
  });
});
