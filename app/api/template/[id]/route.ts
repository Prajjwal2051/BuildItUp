import { db } from "@/lib/db";
import { templatePath } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import { readTemplateFromJson, saveTemplateToJson } from "@/modules/playground/lib/path-to-json";

