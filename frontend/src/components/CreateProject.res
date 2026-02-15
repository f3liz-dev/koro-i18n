open Preact

@jsx.component
let make = (~onSubmit: (string, string) => unit) => {
  let (expanded, setExpanded) = useState(() => false)
  let (name, setName) = useState(() => "")
  let (description, setDescription) = useState(() => "")

  let handleSubmit = (e: JsxEvent.Form.t) => {
    JsxEvent.Form.preventDefault(e)
    if name->String.trim != "" {
      onSubmit(name->String.trim, description->String.trim)
      setName(_ => "")
      setDescription(_ => "")
      setExpanded(_ => false)
    }
  }

  <div className="form-card">
    <div
      className="form-card-header"
      onClick={_ => setExpanded(prev => !prev)}
    >
      <span> {(expanded ? "−" : "+")->string} </span>
      <span> {"New project"->string} </span>
    </div>
    {if expanded {
      <form onSubmit={handleSubmit} className="form-card-body fade-in">
        <div className="form-group">
          <label htmlFor="name"> {"Name"->string} </label>
          <input
            id="name"
            type_="text"
            className="input"
            value={name}
            onInput={e => {
              let target = e->JsxEvent.Form.target
              let value: string = target["value"]
              setName(_ => value)
            }}
            placeholder="my-project"
          />
        </div>
        <div className="form-group">
          <label htmlFor="desc"> {"Description"->string} </label>
          <input
            id="desc"
            type_="text"
            className="input"
            value={description}
            onInput={e => {
              let target = e->JsxEvent.Form.target
              let value: string = target["value"]
              setDescription(_ => value)
            }}
            placeholder="Optional"
          />
        </div>
        <button type_="submit" className="btn btn-primary"> {"Create"->string} </button>
      </form>
    } else {
      Preact.null
    }}
  </div>
}
