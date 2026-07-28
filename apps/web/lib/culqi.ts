export const culqiCheckoutConfig = {
  publicKey: process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY ?? "",
  environment: "test" as const,
  currency: "PEN" as const,
  paymentMethods: [
    "Visa",
    "Mastercard",
    "American Express",
    "Diners Club",
    "Yape",
    "Plin / QR",
    "PagoEfectivo",
    "Cuotéalo BCP",
  ],
};

export const isCulqiConfigured = Boolean(culqiCheckoutConfig.publicKey);
