module Main exposing (main)

import Browser
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Url
import Url.Parser as Parser exposing ((</>), Parser, s, string)


-- MAIN


main : Program Flags Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlChange = UrlChanged
        , onUrlRequest = LinkClicked
        }


-- MODEL


type alias Flags =
    {}


type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , route : Route
    , user : Maybe User
    , projects : List Project
    , loading : Bool
    , error : Maybe String
    }


type alias User =
    { username : String
    , avatar : String
    }


type alias Project =
    { name : String
    , repository : String
    , progress : Int
    }


type Route
    = Home
    | Login
    | Dashboard
    | NotFound


init : Flags -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init flags url key =
    let
        route =
            urlToRoute url
    in
    ( { key = key
      , url = url
      , route = route
      , user = Nothing
      , projects = []
      , loading = False
      , error = Nothing
      }
    , checkAuth
    )


-- UPDATE


type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | GotUser (Result Http.Error User)
    | GotProjects (Result Http.Error (List Project))
    | Login
    | Logout


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
                route =
                    urlToRoute url
            in
            ( { model | url = url, route = route }
            , case route of
                Dashboard ->
                    if model.user /= Nothing then
                        fetchProjects
                    else
                        Cmd.none
                
                _ ->
                    Cmd.none
            )

        GotUser result ->
            case result of
                Ok user ->
                    ( { model | user = Just user, loading = False }
                    , if model.route == Dashboard then
                        fetchProjects
                      else
                        Cmd.none
                    )

                Err _ ->
                    ( { model | user = Nothing, loading = False }, Cmd.none )

        GotProjects result ->
            case result of
                Ok projects ->
                    ( { model | projects = projects, loading = False }, Cmd.none )

                Err err ->
                    ( { model | error = Just "Failed to load projects", loading = False }, Cmd.none )

        Login ->
            ( model, Nav.load "/api/auth/login" )

        Logout ->
            ( { model | user = Nothing, projects = [] }, Nav.load "/api/auth/logout" )


-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none


-- VIEW


view : Model -> Browser.Document Msg
view model =
    { title = "Koro i18n"
    , body =
        [ div [ class "app" ]
            [ viewHeader model
            , div [ class "main" ]
                [ case model.route of
                    Home ->
                        viewHome model

                    Login ->
                        viewLogin model

                    Dashboard ->
                        viewDashboard model

                    NotFound ->
                        viewNotFound model
                ]
            ]
        ]
    }


viewHeader : Model -> Html Msg
viewHeader model =
    header [ class "header" ]
        [ div [ class "header-inner" ]
            [ a [ href "/", class "brand" ]
                [ text "🌐 "
                , span [] [ text "Koro i18n" ]
                ]
            , nav [ class "nav" ]
                (case model.user of
                    Just user ->
                        [ a [ href "/dashboard" ] [ text "Projects" ]
                        , button [ class "btn ghost", onClick Logout ] [ text "Logout" ]
                        ]

                    Nothing ->
                        [ a [ href "/login", class "btn primary" ] [ text "Login" ]
                        ]
                )
            ]
        ]


viewHome : Model -> Html Msg
viewHome model =
    div [ class "home-page" ]
        [ div [ class "home-hero" ]
            [ div [ class "home-icon" ] [ text "🌐" ]
            , h1 [ class "home-title" ] [ text "Koro i18n" ]
            , p [ class "home-subtitle" ] 
                [ text "Streamlined translation management for modern development teams." ]
            , div [ class "home-actions" ]
                [ case model.user of
                    Just _ ->
                        a [ href "/dashboard", class "btn primary lg" ] 
                            [ text "Go to Dashboard →" ]

                    Nothing ->
                        a [ href "/login", class "btn primary lg" ] 
                            [ text "Get Started with GitHub" ]
                ]
            , div [ class "home-features" ]
                [ span [ class "feature-pill" ] [ text "⚡ Fast & Real-time" ]
                , span [ class "feature-pill" ] [ text "🔗 GitHub Integration" ]
                , span [ class "feature-pill" ] [ text "🆓 Free & Open Source" ]
                ]
            ]
        ]


viewLogin : Model -> Html Msg
viewLogin model =
    div [ class "login-page" ]
        [ div [ class "login-card" ]
            [ h1 [] [ text "Welcome to Koro i18n" ]
            , p [ class "text-secondary" ] 
                [ text "Sign in with your GitHub account to get started" ]
            , button [ class "btn primary lg", onClick Login ] 
                [ text "Sign in with GitHub" ]
            ]
        ]


viewDashboard : Model -> Html Msg
viewDashboard model =
    div [ class "dashboard-page" ]
        [ div [ class "dashboard-header" ]
            [ div []
                [ h1 [] [ text "Your Projects" ]
                , p [ class "text-secondary" ] 
                    [ text "Manage and track your translation projects" ]
                ]
            , a [ href "/projects/create", class "btn primary" ] 
                [ text "+ Create Project" ]
            ]
        , case model.user of
            Nothing ->
                div [ class "message info" ] 
                    [ text "Please login to view your projects" ]

            Just _ ->
                if List.isEmpty model.projects then
                    div [ class "empty-state" ]
                        [ div [ class "empty-icon" ] [ text "📁" ]
                        , h2 [] [ text "No projects yet" ]
                        , p [] [ text "Create your first translation project to get started" ]
                        , a [ href "/projects/create", class "btn primary" ] 
                            [ text "Create Project" ]
                        ]
                else
                    div [ class "projects-grid" ]
                        (List.map viewProjectCard model.projects)
        ]


viewProjectCard : Project -> Html Msg
viewProjectCard project =
    a [ href ("/projects/" ++ project.name), class "card interactive" ]
        [ h3 [] [ text project.name ]
        , p [ class "text-secondary text-sm" ] [ text project.repository ]
        , div [ class "progress-section" ]
            [ div [ class "progress-bar" ]
                [ div 
                    [ class "progress-fill"
                    , style "width" (String.fromInt project.progress ++ "%")
                    ] 
                    []
                ]
            , span [ class "text-xs text-muted" ] 
                [ text (String.fromInt project.progress ++ "% complete") ]
            ]
        ]


viewNotFound : Model -> Html Msg
viewNotFound model =
    div [ class "not-found-page" ]
        [ h1 [] [ text "404" ]
        , p [] [ text "Page not found" ]
        , a [ href "/", class "btn" ] [ text "Go Home" ]
        ]


-- ROUTING


urlToRoute : Url.Url -> Route
urlToRoute url =
    Maybe.withDefault NotFound (Parser.parse routeParser url)


routeParser : Parser (Route -> a) a
routeParser =
    Parser.oneOf
        [ Parser.map Home Parser.top
        , Parser.map Login (s "login")
        , Parser.map Dashboard (s "dashboard")
        , Parser.map Dashboard (s "projects")
        ]


-- HTTP


checkAuth : Cmd Msg
checkAuth =
    Http.get
        { url = "/api/auth/me"
        , expect = Http.expectJson GotUser userDecoder
        }


fetchProjects : Cmd Msg
fetchProjects =
    Http.get
        { url = "/api/projects"
        , expect = Http.expectJson GotProjects (Decode.list projectDecoder)
        }


userDecoder : Decoder User
userDecoder =
    Decode.map2 User
        (Decode.field "username" Decode.string)
        (Decode.field "avatar" Decode.string)


projectDecoder : Decoder Project
projectDecoder =
    Decode.map3 Project
        (Decode.field "name" Decode.string)
        (Decode.field "repository" Decode.string)
        (Decode.field "progress" Decode.int)
