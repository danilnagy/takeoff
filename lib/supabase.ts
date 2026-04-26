"use client";

import { createClient } from "@supabase/supabase-js";
import type { ProjectRecord, ScaleState, TakeoffElement } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

const PROJECT_PREFIX = "takeoff.project.";
const ELEMENT_PREFIX = "takeoff.elements.";
const SCALE_PREFIX = "takeoff.scale.";

export async function createProjectFromPdf(file: File): Promise<ProjectRecord> {
  const id = crypto.randomUUID();

  if (!supabase) {
    const url = URL.createObjectURL(file);
    const record = { id, pdfUrl: url, createdAt: new Date().toISOString() };
    sessionStorage.setItem(`${PROJECT_PREFIX}${id}`, JSON.stringify(record));
    return record;
  }

  const path = `${id}/${file.name}`;
  const upload = await supabase.storage.from("pdfs").upload(path, file, {
    contentType: "application/pdf",
    upsert: false
  });

  if (upload.error) throw upload.error;

  const publicUrl = supabase.storage.from("pdfs").getPublicUrl(path).data.publicUrl;
  const insert = await supabase
    .from("projects")
    .insert({ id, pdf_url: publicUrl })
    .select("id,pdf_url,created_at")
    .single();

  if (insert.error) throw insert.error;

  return {
    id: insert.data.id,
    pdfUrl: insert.data.pdf_url,
    createdAt: insert.data.created_at
  };
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  if (!supabase) {
    const raw = sessionStorage.getItem(`${PROJECT_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  }

  const result = await supabase
    .from("projects")
    .select("id,pdf_url,created_at")
    .eq("id", id)
    .single();

  if (result.error) return null;

  return {
    id: result.data.id,
    pdfUrl: result.data.pdf_url,
    createdAt: result.data.created_at
  };
}

export async function getPageKey(projectId: string, pageNumber: number): Promise<string> {
  if (!supabase) return `${projectId}.${pageNumber}`;

  const existing = await supabase
    .from("pages")
    .select("id")
    .eq("project_id", projectId)
    .eq("page_number", pageNumber)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id;

  const created = await supabase
    .from("pages")
    .insert({
      project_id: projectId,
      page_number: pageNumber,
      scale_unit: "meters"
    })
    .select("id")
    .single();

  if (created.error) throw created.error;

  return created.data.id;
}

export async function loadElements(pageKey: string): Promise<TakeoffElement[]> {
  if (!supabase) {
    const raw = sessionStorage.getItem(`${ELEMENT_PREFIX}${pageKey}`);
    return raw ? JSON.parse(raw) : [];
  }

  const result = await supabase
    .from("elements")
    .select("id,type,points,value,display_order")
    .eq("page_id", pageKey)
    .order("display_order", { ascending: true });

  if (result.error) return [];

  return result.data.map((row) => ({
    id: row.id,
    type: row.type,
    points: row.points,
    value: row.value,
    displayOrder: row.display_order
  }));
}

export async function saveElements(pageKey: string, elements: TakeoffElement[]) {
  if (!supabase) {
    sessionStorage.setItem(`${ELEMENT_PREFIX}${pageKey}`, JSON.stringify(elements));
    return;
  }

  await supabase.from("elements").delete().eq("page_id", pageKey);
  if (elements.length === 0) return;

  await supabase.from("elements").insert(
    elements.map((element) => ({
      id: element.id,
      page_id: pageKey,
      type: element.type,
      points: element.points,
      value: element.value,
      display_order: element.displayOrder
    }))
  );
}

export async function loadScale(pageKey: string): Promise<ScaleState> {
  if (!supabase) {
    const raw = sessionStorage.getItem(`${SCALE_PREFIX}${pageKey}`);
    return raw ? JSON.parse(raw) : { factor: null, unit: "meters" };
  }

  const result = await supabase
    .from("pages")
    .select("scale_factor,scale_unit")
    .eq("id", pageKey)
    .maybeSingle();

  if (result.error || !result.data) return { factor: null, unit: "meters" };

  return {
    factor: result.data.scale_factor,
    unit: "meters"
  };
}

export async function saveScale(pageKey: string, scale: ScaleState) {
  if (!supabase) {
    sessionStorage.setItem(`${SCALE_PREFIX}${pageKey}`, JSON.stringify(scale));
    return;
  }

  await supabase.from("pages").upsert({
    id: pageKey,
    scale_factor: scale.factor,
    scale_unit: scale.unit
  });
}
