import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { stripeWebhook } from "./stripeWebhook";
import { whatsappWebhook } from "./whatsappWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: stripeWebhook,
});

http.route({
  path: "/whatsapp/webhook",
  method: "POST",
  handler: whatsappWebhook,
});

export default http;
