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

  <div className="fade-in">
    <button className="nav-back" onClick={_ => onBack()}>
      {`← Projects`->string}
    </button>
    {if loading {
      <div className="loading"> {"Loading…"->string} </div>
    } else {
      switch project {
      | None => <div className="empty-state"> {"Project not found."->string} </div>
      | Some(p) =>
        <div>
          <div className="card" style={{marginBottom: "16px"}}>
            <h2> {p.name->string} </h2>
            {if p.description != "" {
              <p> {p.description->string} </p>
            } else {
              Preact.null
            }}
            <div className="stats">
              <span className="stat">
                <strong> {p.key_count->Int.toString->string} </strong> {" keys"->string}
              </span>
              <span className="stat">
                <strong> {p.locales->Array.length->Int.toString->string} </strong>
                {" locales"->string}
              </span>
              <span className="stat">
                {"source "->string} <strong> {p.source_locale->string} </strong>
              </span>
            </div>
          </div>
          {switch status {
          | None => Preact.null
          | Some(s) =>
            <div className="section">
              <div className="section-title"> {"Locales"->string} </div>
              {if s.locales->Array.length == 0 {
                <div className="empty-state">
                  <h3> {"No translations yet"->string} </h3>
                  <p> {"Import translations via the sync API to get started."->string} </p>
                </div>
              } else {
                s.locales
                ->Array.map(ls => {
                  let percent = if s.total_keys > 0 {
                    ls.translated * 100 / s.total_keys
                  } else {
                    0
                  }
                  <div className="locale-card" key={ls.locale}>
                    <div>
                      <span className="locale-name"> {ls.locale->string} </span>
                      <div className="progress-bar" style={{width: "120px", marginTop: "4px"}}>
                        <div
                          className="progress-fill"
                          style={{width: `${percent->Int.toString}%`}}
                        />
                      </div>
                    </div>
                    <div className="locale-stats">
                      <span className="badge badge-success">
                        {`${ls.approved->Int.toString} approved`->string}
                      </span>
                      {if ls.draft > 0 {
                        <span className="badge badge-warning">
                          {`${ls.draft->Int.toString} draft`->string}
                        </span>
                      } else {
                        Preact.null
                      }}
                      <span className="stat">
                        {`${percent->Int.toString}%`->string}
                      </span>
                    </div>
                  </div>
                })
                ->array
              }}
            </div>
          }}
          {if p.contributors->Array.length > 0 {
            <div className="section">
              <div className="section-title"> {"Contributors"->string} </div>
              <div className="contributor-list">
                {p.contributors
                ->Array.map(c => {
                  <span className="contributor" key={c.author_email}>
                    {c.author_name->string}
                    <span className="contributor-source"> {`(${c.source})`->string} </span>
                  </span>
                })
                ->array}
              </div>
            </div>
          } else {
            Preact.null
          }}
        </div>
      }
    }}
  </div>
}
