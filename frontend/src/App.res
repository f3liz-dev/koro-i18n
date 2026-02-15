open Preact

type view = ProjectList | ProjectDetail(int)

@jsx.component
let make = () => {
  let (view, setView) = useState(() => ProjectList)
  let (projects, setProjects) = useState(() => [])
  let (loading, setLoading) = useState(() => true)

  let loadProjects = async () => {
    setLoading(_ => true)
    let data = await Api.getProjects()
    setProjects(_ => data)
    setLoading(_ => false)
  }

  useEffect0(() => {
    loadProjects()->ignore
    None
  })

  let handleCreateProject = async (name: string, description: string) => {
    let _ = await Api.createProject(~name, ~description)
    let _ = await loadProjects()
  }

  <div className="app">
    <header className="header">
      <div>
        <h1 onClick={_ => setView(_ => ProjectList)} style={{cursor: "pointer"}}>
          {"koro-i18n"->string}
        </h1>
        <span className="header-subtitle"> {"Translation Management"->string} </span>
      </div>
    </header>
    {switch view {
    | ProjectList =>
      <div>
        <CreateProject
          onSubmit={(name, desc) => handleCreateProject(name, desc)->ignore}
        />
        {if loading {
          <div className="loading"> {"Loading projects..."->string} </div>
        } else if projects->Array.length == 0 {
          <div className="empty-state">
            <h3> {"No projects yet"->string} </h3>
            <p> {"Create your first project above to get started."->string} </p>
          </div>
        } else {
          projects
          ->Array.map(p => {
            <ProjectCard
              key={p.id->Int.toString}
              name={p.name}
              description={p.description}
              keyCount={0}
              onClick={() => setView(_ => ProjectDetail(p.id))}
            />
          })
          ->array
        }}
      </div>
    | ProjectDetail(projectId) =>
      <ProjectDetailView projectId onBack={() => setView(_ => ProjectList)} />
    }}
  </div>
}
