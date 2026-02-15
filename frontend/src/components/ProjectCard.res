open Preact

@jsx.component
let make = (~name: string, ~description: string, ~keyCount: int, ~onClick: unit => unit) => {
  <div className="card" onClick={_ => onClick()}>
    <h2> {name->string} </h2>
    <p> {description->string} </p>
    <div className="stats">
      <span className="stat">
        <strong> {keyCount->Int.toString->string} </strong> {" keys"->string}
      </span>
    </div>
  </div>
}
