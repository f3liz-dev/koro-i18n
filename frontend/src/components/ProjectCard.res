open Preact

@jsx.component
let make = (
  ~name: string,
  ~description: string,
  ~keyCount: int,
  ~localeCount: int,
  ~onClick: unit => unit,
) => {
  <div className="card card-interactive" onClick={_ => onClick()}>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "start"}}>
      <div>
        <h2> {name->string} </h2>
        {if description != "" {
          <p> {description->string} </p>
        } else {
          Preact.null
        }}
      </div>
      {if localeCount > 0 {
        <span className="badge badge-info"> {`${localeCount->Int.toString} locales`->string} </span>
      } else {
        Preact.null
      }}
    </div>
    <div className="stats">
      <span className="stat">
        <strong> {keyCount->Int.toString->string} </strong> {" keys"->string}
      </span>
    </div>
  </div>
}
