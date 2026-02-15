open Preact

@jsx.component
let make = (
  ~name: string,
  ~description: string,
  ~keyCount: int,
  ~localeCount: int,
  ~onClick: unit => unit,
) => {
  let percent = if keyCount > 0 && localeCount > 0 {
    100
  } else {
    0
  }

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
    {if keyCount > 0 {
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{width: `${percent->Int.toString}%`}}
        />
      </div>
    } else {
      Preact.null
    }}
  </div>
}
