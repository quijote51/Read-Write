// Supabase Edge Function «leer-albaran»: lee la foto de un albarán con Claude y devuelve sus datos para revisar.
// - Solo para cuentas con rol admin, dirección o chef y el módulo «costes» (se pregunta a la base de datos con
//   la sesión de quien llama: mi_perfil).
// - Límite de fotos por hotel y día (uso_ia_sumar, supabase/albaran-ia.sql) para que el gasto no se dispare.
// - La clave de Claude vive en los secretos de Supabase (ANTHROPIC_API_KEY): nunca llega al móvil.
// Entrada (JSON): { imagen: base64 JPEG/PNG, tipo?: "image/jpeg", articulos?: ["NOMBRE (KG)", …], proveedores?: [..] }
// Salida (JSON): { proveedor, numero, fecha, lineas: [{texto, articulo, cantidad, unidad, importe}], total, notas }
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.135.0/helpers/zod";
import * as z from "npm:zod@3.25.76/v4";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const FOTOS_DIA = 60; // por hotel y día
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });

const Albaran = z.object({
  proveedor: z.string().nullable().describe("Nombre del proveedor tal como aparece; si coincide con uno de la lista, ese nombre exacto"),
  numero: z.string().nullable().describe("Número del albarán o factura"),
  fecha: z.string().nullable().describe("Fecha del albarán en formato AAAA-MM-DD"),
  lineas: z.array(z.object({
    texto: z.string().describe("Descripción del producto tal como aparece en el albarán"),
    articulo: z.string().nullable().describe("Nombre EXACTO del artículo del inventario que corresponde (sin la unidad entre paréntesis), o null si no hay uno claro"),
    cantidad: z.number().nullable().describe("Cantidad, en la unidad del artículo del inventario si se ha enlazado (convierte g→kg, ml→l, cajas→unidades si el albarán lo indica)"),
    unidad: z.string().nullable().describe("Unidad de la cantidad: KG, LITRO, UNID o PQT"),
    importe: z.number().nullable().describe("Importe total de la línea SIN IVA, en euros"),
  })),
  total: z.number().nullable().describe("Total del albarán sin IVA, si aparece"),
  notas: z.string().nullable().describe("Dudas para quien revisa: líneas ilegibles, importes con IVA incluido, descuentos…"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Usa POST" }, 405);
  try {
    // ¿Quién llama y qué puede hacer?
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: perfil, error: ePerfil } = await supa.rpc("mi_perfil");
    if (ePerfil || !perfil?.rol) return responder({ error: "Hay que iniciar sesión con una cuenta del equipo." }, 401);
    if (!["admin", "direccion", "chef"].includes(perfil.rol)) return responder({ error: "Tu rol no apunta albaranes." }, 403);
    if (Array.isArray(perfil.modulos) && !perfil.modulos.includes("costes")) return responder({ error: "El módulo Costes no está incluido en vuestro plan." }, 403);

    const clave = Deno.env.get("ANTHROPIC_API_KEY");
    if (!clave) return responder({ error: "La lectura con foto no está activada todavía." }, 503);

    const { imagen, tipo, articulos, proveedores } = await req.json();
    if (typeof imagen !== "string" || imagen.length < 1000) return responder({ error: "No ha llegado la foto." }, 400);
    if (imagen.length > 4_000_000) return responder({ error: "La foto es demasiado grande." }, 413);
    const media = tipo === "image/png" ? "image/png" : "image/jpeg";

    // Límite diario por hotel (con la clave de servicio, que no sale del servidor)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: usadas, error: eUso } = await admin.rpc("uso_ia_sumar", { p_hotel: perfil.hotel, p_tipo: "albaran" });
    if (eUso) throw eUso;
    if ((usadas ?? 0) > FOTOS_DIA) return responder({ error: `Hoy ya se han leído ${FOTOS_DIA} fotos. Mañana se puede seguir.` }, 429);

    const lista = (a: unknown) => Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, 600).join("\n") : "";
    const client = new Anthropic({ apiKey: clave });
    const resp = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(Albaran) },
      system: "Lees albaranes y facturas de proveedores de cocinas de hoteles y restaurantes en España. Copias los datos tal como aparecen, sin inventar: si algo no se lee, pon null y explícalo en notas. Los importes de línea van sin IVA; si el albarán solo da precios con IVA, dilo en notas.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: media, data: imagen } },
          { type: "text", text: `Extrae los datos de este albarán.\n\nArtículos del inventario (nombre y unidad), para enlazar cada línea con el suyo:\n${lista(articulos) || "(ninguno)"}\n\nProveedores conocidos:\n${lista(proveedores) || "(ninguno)"}` },
        ],
      }],
    });
    if (resp.stop_reason === "refusal") return responder({ error: "No se ha podido leer esta foto." }, 422);
    if (!resp.parsed_output) return responder({ error: "No se ha podido leer el albarán. Prueba con una foto más nítida." }, 422);
    return responder({ ...resp.parsed_output, uso: { hoy: usadas, limite: FOTOS_DIA } });
  } catch (e) {
    console.error("leer-albaran", e);
    const msg = e instanceof Anthropic.RateLimitError ? "Hay mucha demanda ahora mismo. Prueba en un minuto."
      : e instanceof Anthropic.APIError ? "El servicio de lectura no responde. Prueba más tarde."
      : "No se ha podido leer el albarán.";
    return responder({ error: msg }, 500);
  }
});
