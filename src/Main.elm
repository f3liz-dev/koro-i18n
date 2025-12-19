module Main exposing (..)

import Browser
import Browser.Navigation as Nav
import Url
import Url.Parser as Parser exposing ((</>), (<?>))
import Url.Parser.Query as Query
import Html exposing (..)
import Html.Attributes exposing (..)
import Http

import Api
import Auth
import Pages.Home
import Pages.Login
import Pages.Dashboard
import Pages.Project.Create
import Pages.Project.View as ProjectView
import Pages.Translation.Editor
import Pages.NotFound

-- MODEL

type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , page : Page
    , auth : Auth.Model
    , backendUrl : String
    }

type Page
    = Home
    | Login Pages.Login.Model
    | Dashboard Pages.Dashboard.Model
    | CreateProject Pages.Project.Create.Model
    | ProjectViewPage ProjectView.Model
    | TranslationEditor Pages.Translation.Editor.Model
    | NotFound

-- ROUTING

parser : Parser.Parser (Route -> a) a
parser =
    Parser.oneOf
        [ Parser.map HomeRoute Parser.top
        , Parser.map LoginRoute (Parser.s "login")
        , Parser.map DashboardRoute (Parser.s "dashboard")
        , Parser.map CreateProjectRoute (Parser.s "projects" </> Parser.s "new")
        -- Direct editor path: /projects/:projectName/translations/:language/editor?filename=...
        , Parser.map (\projectName lang maybeFile -> TranslationEditorRoute projectName (Just lang) maybeFile)
            (Parser.s "projects" </> Parser.string </> Parser.s "translations" </> Parser.string </> Parser.s "editor" <?> Query.string "filename")
        -- Editor via query params: /projects/:projectName/translations?language=...&filename=...
        , Parser.map TranslationEditorRoute (Parser.s "projects" </> Parser.string </> Parser.s "translations" <?> Query.string "language" <?> Query.string "filename")
        -- Project root (after more specific translation routes to avoid shadowing)
        , Parser.map ProjectViewRoute (Parser.s "projects" </> Parser.string)
        ]

type Route
    = HomeRoute
    | LoginRoute
    | DashboardRoute
    | CreateProjectRoute
    | TranslationEditorRoute String (Maybe String) (Maybe String)
    | ProjectViewRoute String

-- UPDATE

type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | GotUser (Result Http.Error Api.User)
    | LoginMsg Pages.Login.Msg
    | DashboardMsg Pages.Dashboard.Msg
    | CreateProjectMsg Pages.Project.Create.Msg
    | ProjectViewMsg ProjectView.Msg
    | TranslationEditorMsg Pages.Translation.Editor.Msg

main : Program String Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = LinkClicked
        , onUrlChange = UrlChanged
        }

init : String -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init backendUrl url key =
    let
        ( page, pageCmd ) =
            stepUrl backendUrl url Auth.init

        authCmd =
            Api.getUser GotUser
    in
    ( { key = key
      , url = url
      , page = page
      , auth = Auth.init
      , backendUrl = backendUrl
      }
    , Cmd.batch [ pageCmd, authCmd ]
    )

stepUrl : String -> Url.Url -> Auth.Model -> ( Page, Cmd Msg )
stepUrl backendUrl url auth =
    let
        maybeRoute =
            Parser.parse parser url
    in
    case maybeRoute of
        Just HomeRoute ->
            ( Home, Cmd.none )

        Just LoginRoute ->
            let
                ( loginModel, loginCmd ) = Pages.Login.init backendUrl
            in
            ( Login loginModel, Cmd.map LoginMsg loginCmd )

        Just DashboardRoute ->
            requireAuth backendUrl auth <|
                let
                    ( dashboardModel, dashboardCmd ) = Pages.Dashboard.init
                in
                ( Dashboard dashboardModel, Cmd.map DashboardMsg dashboardCmd )

        Just CreateProjectRoute ->
            requireAuth backendUrl auth <|
                let
                    ( createModel, createCmd ) = Pages.Project.Create.init
                in
                ( CreateProject createModel, Cmd.map CreateProjectMsg createCmd )

        Just (TranslationEditorRoute projectName maybeLang maybeFile) ->
            let
                -- If no language is specified for the project root, use an empty
                -- language string so the editor requests aggregated counts for
                -- all languages. Previously this defaulted to "en" which made
                -- the project root show only English counts.
                lang = Maybe.withDefault "" maybeLang
                -- When visiting /projects/:projectName without a filename,
                -- use empty string so the editor shows the languages view
                -- (counts) instead of a default file
                file = Maybe.withDefault "" maybeFile
            in
            case auth of
                Auth.LoggedIn _ ->
                    let
                        ( editorModel, editorCmd ) = Pages.Translation.Editor.init projectName lang file
                    in
                    ( TranslationEditor editorModel, Cmd.map TranslationEditorMsg editorCmd )

                Auth.Checking ->
                    -- Don't execute network commands while auth is still being checked;
                    -- initialize model so UI can show a loading state but avoid unauthenticated API calls
                    let
                        ( editorModel, _ ) = Pages.Translation.Editor.init projectName lang file
                    in
                    ( TranslationEditor editorModel, Cmd.none )

                Auth.LoggedOut ->
                    let
                        ( loginModel, loginCmd ) = Pages.Login.init backendUrl
                    in
                    ( Login loginModel, Cmd.map LoginMsg loginCmd )

        Just (ProjectViewRoute projectName) ->
            requireAuth backendUrl auth <|
                let
                    ( projectModel, projectCmd ) = ProjectView.init projectName
                in
                ( ProjectViewPage projectModel, Cmd.map ProjectViewMsg projectCmd )

        Nothing ->
            ( NotFound, Cmd.none )

requireAuth : String -> Auth.Model -> ( Page, Cmd Msg ) -> ( Page, Cmd Msg )
requireAuth backendUrl auth ( page, cmd ) =
    case auth of
        Auth.LoggedIn _ ->
            ( page, cmd )

        Auth.Checking ->
             ( page, cmd ) -- Allow loading state for now

        Auth.LoggedOut ->
            let
                ( loginModel, loginCmd ) = Pages.Login.init backendUrl
            in
            ( Login loginModel, Cmd.map LoginMsg loginCmd )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        LinkClicked urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( model, Nav.pushUrl model.key (Url.toString url) )

                Browser.External href ->
                    ( model, Nav.load href )

        UrlChanged url ->
            let
                ( page, cmd ) =
                    stepUrl model.backendUrl url model.auth
            in
            ( { model | url = url, page = page }, cmd )

        GotUser result ->
            case result of
                Ok user ->
                    let
                        newAuth = Auth.LoggedIn user
                        ( newPage, newCmd ) = stepUrl model.backendUrl model.url newAuth
                    in
                    ( { model | auth = newAuth, page = newPage }
                    , newCmd
                    )

                Err _ ->
                    let
                        newAuth = Auth.LoggedOut
                        ( newPage, newCmd ) = stepUrl model.backendUrl model.url newAuth
                    in
                     ( { model | auth = newAuth, page = newPage }
                    , newCmd
                    )

        LoginMsg loginMsg ->
             case model.page of
                Login loginModel ->
                    let
                        ( newLoginModel, loginCmd ) =
                            Pages.Login.update loginMsg loginModel
                    in
                    ( { model | page = Login newLoginModel }
                    , Cmd.map LoginMsg loginCmd
                    )

                _ ->
                    ( model, Cmd.none )

        DashboardMsg dashboardMsg ->
            case model.page of
                Dashboard dashboardModel ->
                    let
                        ( newDashboardModel, dashboardCmd ) =
                            Pages.Dashboard.update dashboardMsg dashboardModel
                    in
                    ( { model | page = Dashboard newDashboardModel }
                    , Cmd.map DashboardMsg dashboardCmd
                    )

                _ ->
                    ( model, Cmd.none )

        CreateProjectMsg createMsg ->
            case model.page of
                CreateProject createModel ->
                    let
                        ( newCreateModel, createCmd ) =
                            Pages.Project.Create.update createMsg createModel

                        finalCmd =
                             case createMsg of
                                Pages.Project.Create.GotResult (Ok _) ->
                                    Cmd.batch
                                        [ Cmd.map CreateProjectMsg createCmd
                                        , Nav.pushUrl model.key "/dashboard"
                                        ]
                                _ ->
                                    Cmd.map CreateProjectMsg createCmd

                    in
                    ( { model | page = CreateProject newCreateModel }
                    , finalCmd
                    )

                _ ->
                    ( model, Cmd.none )

        ProjectViewMsg projectMsg ->
            case model.page of
                ProjectViewPage projectModel ->
                    let
                        ( newProjectModel, projectCmd ) =
                            ProjectView.update projectMsg projectModel
                    in
                    ( { model | page = ProjectViewPage newProjectModel }
                    , Cmd.map ProjectViewMsg projectCmd
                    )

                _ ->
                    ( model, Cmd.none )

        TranslationEditorMsg editorMsg ->
             case model.page of
                TranslationEditor editorModel ->
                    let
                        ( newEditorModel, editorCmd ) =
                            Pages.Translation.Editor.update editorMsg editorModel
                    in
                    ( { model | page = TranslationEditor newEditorModel }
                    , Cmd.map TranslationEditorMsg editorCmd
                    )

                _ ->
                    ( model, Cmd.none )

-- SUBSCRIPTIONS

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

-- VIEW

view : Model -> Browser.Document Msg
view model =
    { title = "i18n Platform"
    , body =
        [ viewHeader model.auth
        , case model.page of
            Home -> Pages.Home.view
            Login loginModel -> Html.map LoginMsg (Pages.Login.view loginModel)
            Dashboard dashboardModel -> Html.map DashboardMsg (Pages.Dashboard.view dashboardModel)
            CreateProject createModel -> Html.map CreateProjectMsg (Pages.Project.Create.view createModel)
            ProjectViewPage projectModel -> Html.map ProjectViewMsg (ProjectView.view projectModel)
            TranslationEditor editorModel -> Html.map TranslationEditorMsg (Pages.Translation.Editor.view editorModel)
            NotFound -> Pages.NotFound.view
        , viewFooter
        ]
    }

viewHeader : Auth.Model -> Html Msg
viewHeader auth =
    header [ class "header" ]
        [ div [ class "inner" ]
            [ a [ href "/", class "brand" ]
                [ text "i18n Platform"
                ]
            , nav [ class "nav" ]
                (case auth of
                    Auth.LoggedIn user ->
                        [ a [ href "/dashboard" ] [ text "Dashboard" ]
                        , span [ class "text-sm text-secondary" ] [ text user.username ]
                        ]

                    _ ->
                        [ a [ href "/login" ] [ text "Login" ]
                        ]
                )
            ]
        ]

viewFooter : Html Msg
viewFooter =
    footer [ class "footer" ]
        [ text "© 2025 i18n Platform. All rights reserved." ]
