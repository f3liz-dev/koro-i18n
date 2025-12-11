module Route exposing (Route(..), fromUrl, href, pushUrl)

import Browser.Navigation as Nav
import Html exposing (Attribute)
import Html.Attributes as Attr
import Url exposing (Url)
import Url.Parser as Parser exposing ((</>), Parser, oneOf, s, string)


-- ROUTING


type Route
    = Home
    | Login
    | Dashboard
    | CreateProject
    | ProjectView String
    | LanguageSelection String
    | FileSelection String String
    | TranslationEditor String String String
    | ProjectSettings String
    | History
    | NotFound


parser : Parser (Route -> a) a
parser =
    oneOf
        [ Parser.map Home Parser.top
        , Parser.map Login (s "login")
        , Parser.map Dashboard (s "dashboard")
        , Parser.map Dashboard (s "projects")
        , Parser.map CreateProject (s "projects" </> s "create")
        , Parser.map ProjectSettings (s "projects" </> string </> s "settings")
        , Parser.map FileSelection (s "projects" </> string </> s "language" </> string)
        , Parser.map TranslationEditor (s "projects" </> string </> s "translate" </> string </> string)
        , Parser.map ProjectView (s "projects" </> string)
        , Parser.map History (s "history")
        ]


-- PUBLIC HELPERS


fromUrl : Url -> Route
fromUrl url =
    Maybe.withDefault NotFound (Parser.parse parser url)


href : Route -> Attribute msg
href targetRoute =
    Attr.href (routeToString targetRoute)


pushUrl : Nav.Key -> Route -> Cmd msg
pushUrl key route =
    Nav.pushUrl key (routeToString route)


-- INTERNAL


routeToString : Route -> String
routeToString route =
    "/" ++ String.join "/" (routeToPieces route)


routeToPieces : Route -> List String
routeToPieces route =
    case route of
        Home ->
            []

        Login ->
            [ "login" ]

        Dashboard ->
            [ "dashboard" ]

        CreateProject ->
            [ "projects", "create" ]

        ProjectView name ->
            [ "projects", name ]

        LanguageSelection name ->
            [ "projects", name ]

        FileSelection name lang ->
            [ "projects", name, "language", lang ]

        TranslationEditor name lang file ->
            [ "projects", name, "translate", lang, file ]

        ProjectSettings name ->
            [ "projects", name, "settings" ]

        History ->
            [ "history" ]

        NotFound ->
            [ "404" ]
