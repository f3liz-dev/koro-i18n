open Preact

@jsx.component
let make = (~translations: array<Api.translation>, ~locale: string) => {
  <div className="card">
    <h2> {`Translations — ${locale}`->string} </h2>
    {if translations->Array.length == 0 {
      <div className="empty-state">
        <p> {"No translations for this locale yet."->string} </p>
      </div>
    } else {
      <div>
        {translations
        ->Array.map(t => {
          <div className="translation-row" key={t.key}>
            <div>
              <div className="translation-key"> {t.key->string} </div>
              <div className="translation-default"> {t.default_value->string} </div>
            </div>
            <div> {t.value->string} </div>
            <span className={t.status == "approved" ? "badge badge-success" : "badge badge-warning"}>
              {t.status->string}
            </span>
          </div>
        })
        ->array}
      </div>
    }}
  </div>
}
