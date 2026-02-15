type project = {
  id: int,
  name: string,
  description: string,
  source_locale: string,
  repo_url: string,
  key_count: int,
  locale_count: int,
  created_at: string,
  updated_at: string,
}

type contributor = {
  author_name: string,
  author_email: string,
  source: string,
}

type projectDetail = {
  id: int,
  name: string,
  description: string,
  source_locale: string,
  repo_url: string,
  key_count: int,
  locales: array<string>,
  contributors: array<contributor>,
}

type sourceKey = {
  id: int,
  project_id: int,
  key: string,
  file_path: string,
  default_value: string,
  context: string,
}

type translation = {
  id: int,
  locale: string,
  value: string,
  status: string,
  author_name: string,
  source: string,
  key: string,
  default_value: string,
  context: string,
}

type localeStat = {
  locale: string,
  translated: int,
  approved: int,
  draft: int,
}

type translationStatus = {
  total_keys: int,
  locales: array<localeStat>,
}

@val external _fetch: string => promise<'a> = "fetch"

@val
external fetchWithInit: (string, 'opts) => promise<'a> = "fetch"

@send external json: 'a => promise<'b> = "json"

let getProjects = async () => {
  let resp = await _fetch("/api/projects")
  let data: array<project> = await json(resp)
  data
}

let getProject = async (id: int) => {
  let resp = await _fetch(`/api/projects/${id->Int.toString}`)
  let data: projectDetail = await json(resp)
  data
}

let createProject = async (~name: string, ~description: string) => {
  let resp = await fetchWithInit(
    "/api/projects",
    {
      "method": "POST",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringifyAny({"name": name, "description": description}),
    },
  )
  let data: project = await json(resp)
  data
}

let getTranslationStatus = async (projectId: int) => {
  let resp = await _fetch(`/api/projects/${projectId->Int.toString}/translations`)
  let data: translationStatus = await json(resp)
  data
}

let getTranslations = async (projectId: int, locale: string) => {
  let resp = await _fetch(`/api/projects/${projectId->Int.toString}/translations/${locale}`)
  let data: array<translation> = await json(resp)
  data
}
