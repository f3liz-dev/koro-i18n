type element = Jsx.element

type component<'props> = Jsx.component<'props>

type componentLike<'props, 'return> = Jsx.componentLike<'props, 'return>

@module("preact")
external render: (Jsx.element, Dom.element) => unit = "render"

@module("preact/jsx-runtime")
external jsx: (component<'props>, 'props) => element = "jsx"

@module("preact/jsx-runtime")
external jsxKeyed: (component<'props>, 'props, ~key: string=?, @ignore unit) => element = "jsx"

@module("preact/jsx-runtime")
external jsxs: (component<'props>, 'props) => element = "jsxs"

@module("preact/jsx-runtime")
external jsxsKeyed: (component<'props>, 'props, ~key: string=?, @ignore unit) => element = "jsxs"

external array: array<element> => element = "%identity"
@val external null: element = "null"

external float: float => element = "%identity"
external int: int => element = "%identity"
external string: string => element = "%identity"

type fragmentProps = {children?: element}

@module("preact/jsx-runtime") external jsxFragment: component<fragmentProps> = "Fragment"

module Elements = {
  type props = JsxDOM.domProps

  @module("preact/jsx-runtime")
  external jsx: (string, props) => Jsx.element = "jsx"

  @module("preact/jsx-runtime")
  external div: (string, props) => Jsx.element = "jsx"

  @module("preact/jsx-runtime")
  external jsxKeyed: (string, props, ~key: string=?, @ignore unit) => Jsx.element = "jsx"

  @module("preact/jsx-runtime")
  external jsxs: (string, props) => Jsx.element = "jsxs"

  @module("preact/jsx-runtime")
  external jsxsKeyed: (string, props, ~key: string=?, @ignore unit) => Jsx.element = "jsxs"

  external someElement: element => option<element> = "%identity"
}

@module("preact/hooks")
external useState: (@uncurry (unit => 'state)) => ('state, ('state => 'state) => unit) = "useState"

@module("preact/hooks")
external useReducer: (@uncurry ('state, 'action) => 'state, 'state) => ('state, 'action => unit) =
  "useReducer"

@module("preact/hooks")
external useEffectOnEveryRender: (@uncurry (unit => option<unit => unit>)) => unit = "useEffect"

@module("preact/hooks")
external useEffect: (@uncurry (unit => option<unit => unit>), 'deps) => unit = "useEffect"

@module("preact/hooks")
external useEffect0: (@uncurry (unit => option<unit => unit>), @as(json`[]`) _) => unit =
  "useEffect"

@module("preact/hooks")
external useEffect1: (@uncurry (unit => option<unit => unit>), array<'a>) => unit = "useEffect"

@module("preact/hooks")
external useEffect2: (@uncurry (unit => option<unit => unit>), ('a, 'b)) => unit = "useEffect"

@module("preact/hooks")
external useMemo: (@uncurry (unit => 'any), 'deps) => 'any = "useMemo"

@module("preact/hooks")
external useMemo0: (@uncurry (unit => 'any), @as(json`[]`) _) => 'any = "useMemo"

@module("preact/hooks")
external useCallback: ('f, 'deps) => 'f = "useCallback"

@module("preact/hooks")
external useCallback0: ('f, @as(json`[]`) _) => 'f = "useCallback"

@module("preact/hooks") external useRef: 'value => ref<'value> = "useRef"
