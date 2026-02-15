open Preact

@jsx.component
let make = (~projectId: int, ~onBack: unit => unit) => {
  let (project, setProject) = useState(() => None)
  let (status, setStatus) = useState(() => None)
  let (loading, setLoading) = useState(() => true)

  useEffect0(() => {
    let load = async () => {
      let p = await Api.getProject(projectId)
      setProject(_ => Some(p))
      let s = await Api.getTranslationStatus(projectId)
      setStatus(_ => Some(s))
      setLoading(_ => false)
    }
    load()->ignore
    None
  })

  <div>
    <button className="btn" onClick={_ => onBack()} style={{marginBottom: "16px"}}>
      {"← Back to Projects"->string}
    </button>
    {if loading {
      <div className="loading"> {"Loading project..."->string} </div>
    } else {
      switch project {
      | None => <div className="empty-state"> {"Project not found"->string} </div>
      | Some(p) =>
        <div>
          <div className="card">
            <h2> {p.name->string} </h2>
            <p> {p.description->string} </p>
            <div className="stats">
              <span className="stat">
                <strong> {p.key_count->Int.toString->string} </strong> {" keys"->string}
              </span>
              <span className="stat">
                <strong> {p.locales->Array.length->Int.toString->string} </strong>
                {" locales"->string}
              </span>
              <span className="stat">
                {"Source: "->string} <strong> {p.source_locale->string} </strong>
              </span>
            </div>
          </div>
          {switch status {
          | None => Preact.null
          | Some(s) =>
            if s.locales->Array.length == 0 {
              <div className="card">
                <div className="empty-state">
                  <h3> {"No translations yet"->string} </h3>
                  <p> {"Push source keys and add translations via the API."->string} </p>
                </div>
              </div>
            } else {
              s.locales
              ->Array.map(ls => {
                <div className="card" key={ls.locale}>
                  <h3> {ls.locale->string} </h3>
                  <div className="stats">
                    <span className="stat">
                      <strong> {ls.translated->Int.toString->string} </strong>
                      {" translated"->string}
                    </span>
                    <span className="stat">
                      <strong> {ls.approved->Int.toString->string} </strong>
                      {" approved"->string}
                    </span>
                    <span className="stat">
                      <strong> {ls.draft->Int.toString->string} </strong> {" draft"->string}
                    </span>
                  </div>
                </div>
              })
              ->array
            }
          }}
        </div>
      }
    }}
  </div>
}
