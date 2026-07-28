# Culqi Checkout Custom: integración real pendiente

La interfaz conserva un flujo de pago simulado mientras no exista configuración comercial de Culqi. No se envían datos de tarjeta al backend de LASFIFIJAS y no se realiza ningún cobro real.

Al completar correctamente la simulación, el frontend llama al endpoint autenticado `/memberships/purchase`. Ese endpoint activa y persiste una membresía de prueba dentro de la aplicación. Esta activación sirve únicamente para probar el producto y no representa una compra real.

## Configuración necesaria para Culqi

- `NEXT_PUBLIC_CULQI_PUBLIC_KEY`: llave pública de pruebas para tokenizar con Culqi Checkout Custom.
- `CULQI_SECRET_KEY`: llave secreta de pruebas, disponible solo en el backend.
- Precios finales en céntimos de PEN para cada `MembershipPlan`.
- Métodos habilitados en la cuenta Culqi. Los medios distintos de tarjeta requieren crear previamente una orden de Culqi.
- URL pública HTTPS del webhook y el mecanismo de verificación configurado en CulqiPanel.

## Persistencia requerida antes de cobrar

Antes de habilitar cobros reales se necesita una migración autorizada para registrar, como mínimo, el usuario, plan, importe, moneda, identificador de orden o cargo de Culqi, estado y una clave idempotente con índice único. Sin esa restricción no es seguro impedir cargos o activaciones duplicadas.

## Flujo seguro previsto para pagos reales

1. El backend crea un intento u orden con precio y plan determinados en el servidor.
2. Culqi Checkout Custom captura y tokeniza los datos sensibles en el navegador.
3. El navegador entrega al backend solo el identificador de token u orden.
4. El backend crea o consulta el cargo con la llave secreta y una clave idempotente.
5. La membresía real se activa en una transacción únicamente tras una confirmación válida de Culqi.
6. Los webhooks se verifican, se procesan de forma idempotente y reconcilian estados pendientes.

La documentación oficial de referencia es `https://docs.culqi.com/es/documentacion/checkout/checkout-custom` y `https://apidocs.culqi.com/`.
