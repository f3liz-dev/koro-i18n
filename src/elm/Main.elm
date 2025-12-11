module Main exposing (main)

import Api exposing (Project, User)
import Browser
import Browser.Navigation as Nav
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http
import Route exposing (Route)
import Url


-- MAIN


main : Program () Model Msg
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


type alias Model =
    { key : Nav.Key
    , url : Url.Url
    , route : Route
    , user : Maybe User
    , projects : List Project
    , loadingProjects : Bool
    , error : Maybe String
    }


init : () -> Url.Url -> Nav.Key -> ( Model, Cmd Msg )
init _ url key =
    let
        route =
            Route.fromUrl url
    in
    ( { key = key
      , url = url
      , route = route
      , user = Nothing
      , projects = []
      , loadingProjects = False
      , error = Nothing
      }
    , Cmd.batch
        [ Api.fetchUser GotUser
        , routeCmd route
        ]
    )


routeCmd : Route -> Cmd Msg
routeCmd route =
    case route of
        Route.Dashboard ->
            Api.fetchProjects GotProjects

        _ ->
            Cmd.none


-- UPDATE


type Msg
    = LinkClicked Browser.UrlRequest
    | UrlChanged Url.Url
    | Login
    | Logout
    | GotUser (Result Http.Error User)
    | GotProjects (Result Http.Error (List Project))


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
                    Route.fromUrl url
            in
            ( { model | url = url, route = route }
            , routeCmd route
            )

        Login ->
            ( model, Nav.load "/api/auth/login" )

        Logout ->
            ( { model | user = Nothing }, Nav.load "/api/auth/logout" )

        GotUser result ->
            case result of
                Ok user ->
                    ( { model | user = Just user }, Cmd.none )

                Err _ ->
                    ( model, Cmd.none )

        GotProjects result ->
            case result of
                Ok projects ->
                    ( { model | projects = projects, loadingProjects = False }, Cmd.none )

                Err _ ->
                    ( { model | loadingProjects = False, error = Just "Failed to load projects" }, Cmd.none )


-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


-- VIEW


view : Model -> Browser.Document Msg
view model =
    { title = "Koro i18n - Translation Platform"
    , body =
        [ div [ class "page" ]
            [ viewHeader model
            , main_ [ class "main" ]
                [ div [ class "container" ]
                    [ viewRoute model ]
                ]
            , viewFooter
            ]
        ]
    }


viewHeader : Model -> Html Msg
viewHeader model =
    header [ class "header" ]
        [ div [ class "inner" ]
            [ a [ href "/", class "brand" ]
                [ span [ style "font-size" "1.5rem" ] [ text "🌐" ]
                , span [] [ text "koro i18n" ]
                ]
            , nav [ class "nav" ]
                [ a [ href "/projects" ] [ text "Projects" ]
                , a [ href "/history" ] [ text "History" ]
                , case model.user of
                    Just user ->
                        div [ style "display" "flex", style "align-items" "center", style "gap" "0.75rem" ]
                            [ img
                                [ src user.avatarUrl
                                , alt user.username
                                , style "width" "2rem"
                                , style "height" "2rem"
                                , style "border-radius" "50%"
                                , style "border" "2px solid var(--border)"
                                ]
                                []
                            , button [ onClick Logout, class "btn ghost" ]
                                [ text "Sign Out" ]
                            ]

                    Nothing ->
                        button [ onClick Login, class "btn primary" ]
                            [ text "Sign In" ]
                ]
            ]
        ]


viewFooter : Html Msg
viewFooter =
    footer [ class "footer" ]
        [ span [] [ text "© 2025 koro i18n" ]
        , span [ style "margin" "0 0.75rem", style "color" "var(--border)" ] [ text "·" ]
        , a
            [ href "https://github.com/f3liz-dev/koro-i18n"
            , target "_blank"
            , rel "noopener noreferrer"
            , style "color" "var(--text-muted)"
            , style "text-decoration" "none"
            ]
            [ text "GitHub" ]
        ]


viewRoute : Model -> Html Msg
viewRoute model =
    case model.route of
        Route.Home ->
            viewHome model

        Route.Login ->
            viewLogin

        Route.Dashboard ->
            viewDashboard model

        Route.CreateProject ->
            viewCreateProject

        Route.ProjectView projectName ->
            viewProject projectName

        Route.LanguageSelection projectName ->
            viewLanguageSelection projectName

        Route.FileSelection projectName language ->
            viewFileSelection projectName language

        Route.TranslationEditor projectName language filename ->
            viewTranslationEditor projectName language filename

        Route.ProjectSettings projectName ->
            viewProjectSettings projectName

        Route.History ->
            viewHistory

        Route.NotFound ->
            viewNotFound


-- PAGE VIEWS


viewHome : Model -> Html Msg
viewHome model =
    div
        [ style "display" "flex"
        , style "flex-direction" "column"
        , style "align-items" "center"
        , style "justify-content" "center"
        , style "min-height" "75vh"
        , style "text-align" "center"
        , style "padding" "3rem 1.5rem"
        ]
        [ div [ class "animate-fade-in", style "max-width" "36rem" ]
            [ div
                [ style "font-size" "4.5rem"
                , style "margin-bottom" "1.5rem"
                , style "filter" "drop-shadow(0 4px 6px rgba(59, 130, 246, 0.15))"
                ]
                [ text "🌐" ]
            , h1
                [ style "font-size" "3rem"
                , style "font-weight" "800"
                , style "margin-bottom" "1rem"
                , style "color" "var(--text)"
                , style "letter-spacing" "-0.03em"
                , style "line-height" "1.1"
                ]
                [ text "Koro i18n" ]
            , p
                [ style "font-size" "1.25rem"
                , style "color" "var(--text-secondary)"
                , style "line-height" "1.6"
                , style "max-width" "28rem"
                , style "margin" "0 auto 2.5rem"
                ]
                [ text "Streamlined translation management for modern development teams." ]
            , div [ style "display" "flex", style "flex-direction" "column", style "align-items" "center", style "gap" "1rem" ]
                [ case model.user of
                    Just _ ->
                        a
                            [ href "/dashboard"
                            , class "btn primary lg"
                            , style "padding" "1rem 2.5rem"
                            , style "font-size" "1.0625rem"
                            , style "border-radius" "var(--radius-lg)"
                            ]
                            [ text "Go to Dashboard →" ]

                    Nothing ->
                        button
                            [ onClick Login
                            , class "btn primary lg"
                            , style "padding" "1rem 2.5rem"
                            , style "font-size" "1.0625rem"
                            , style "border-radius" "var(--radius-lg)"
                            ]
                            [ text "Get Started with GitHub" ]
                ]
            , div
                [ style "margin-top" "4rem"
                , style "display" "flex"
                , style "justify-content" "center"
                , style "flex-wrap" "wrap"
                , style "gap" "0.75rem"
                ]
                [ viewFeaturePill "⚡" "Fast & Real-time"
                , viewFeaturePill "🔗" "GitHub Integration"
                , viewFeaturePill "🆓" "Free & Open Source"
                ]
            ]
        ]


viewFeaturePill : String -> String -> Html Msg
viewFeaturePill emoji label =
    span
        [ style "display" "inline-flex"
        , style "align-items" "center"
        , style "gap" "0.5rem"
        , style "padding" "0.625rem 1rem"
        , style "background" "var(--bg)"
        , style "border" "1px solid var(--border)"
        , style "border-radius" "999px"
        , style "font-size" "0.9375rem"
        , style "color" "var(--text-secondary)"
        , style "box-shadow" "var(--shadow-xs)"
        ]
        [ span [] [ text emoji ]
        , text label
        ]


viewLogin : Html Msg
viewLogin =
    div [ class "empty-state" ]
        [ h1 [] [ text "Sign In" ]
        , p [] [ text "Please sign in with GitHub to continue" ]
        , button [ onClick Login, class "btn primary lg" ]
            [ text "Sign In with GitHub" ]
        ]


viewDashboard : Model -> Html Msg
viewDashboard model =
    div []
        [ div [ style "display" "flex", style "justify-content" "space-between", style "align-items" "center", style "margin-bottom" "2rem" ]
            [ h1 [ style "font-size" "2rem", style "margin" "0" ] [ text "Your Projects" ]
            , a [ href "/projects/create", class "btn primary" ]
                [ text "+ New Project" ]
            ]
        , case model.loadingProjects of
            True ->
                viewLoading

            False ->
                case model.projects of
                    [] ->
                        viewEmptyState "No projects yet" "Create your first translation project to get started."

                    projects ->
                        div [ class "grid gap-4" ]
                            (List.map viewProjectCard projects)
        ]


viewProjectCard : Project -> Html Msg
viewProjectCard project =
    a
        [ href ("/projects/" ++ project.name)
        , class "card interactive"
        , style "text-decoration" "none"
        , style "color" "inherit"
        ]
        [ h3 [ style "font-weight" "600", style "margin-bottom" "0.5rem", style "font-size" "1.125rem" ]
            [ text project.name ]
        , p [ class "text-sm text-muted", style "margin-bottom" "0.75rem" ]
            [ text (project.owner ++ "/" ++ project.repository) ]
        , case project.description of
            Just desc ->
                p [ class "text-sm", style "margin-bottom" "0.75rem", style "color" "var(--text-secondary)" ]
                    [ text desc ]

            Nothing ->
                text ""
        , div [ style "display" "flex", style "gap" "0.5rem", style "flex-wrap" "wrap", style "align-items" "center" ]
            [ span [ class "badge" ] [ text project.sourceLanguage ]
            , span [ class "text-muted" ] [ text "→" ]
            , div [ style "display" "flex", style "gap" "0.375rem", style "flex-wrap" "wrap" ]
                (List.map (\lang -> span [ class "badge neutral" ] [ text lang ]) project.targetLanguages)
            ]
        ]


viewCreateProject : Html Msg
viewCreateProject =
    div [ style "max-width" "48rem" ]
        [ h1 [ style "font-size" "2rem", style "margin-bottom" "1.5rem" ] [ text "Create New Project" ]
        , div [ class "card" ]
            [ p [ class "text-secondary", style "margin-bottom" "1.5rem" ]
                [ text "Set up a new translation project connected to your GitHub repository." ]
            , div [ class "space-y-4" ]
                [ div []
                    [ label [ class "label" ] [ text "Project Name" ]
                    , input [ type_ "text", class "input", placeholder "my-awesome-project" ] []
                    ]
                , div []
                    [ label [ class "label" ] [ text "Repository" ]
                    , input [ type_ "text", class "input", placeholder "owner/repository" ] []
                    ]
                , div []
                    [ label [ class "label" ] [ text "Source Language" ]
                    , input [ type_ "text", class "input", placeholder "en" ] []
                    ]
                , div []
                    [ button [ class "btn primary" ] [ text "Create Project" ]
                    , a [ href "/dashboard", class "btn ghost", style "margin-left" "0.5rem" ] [ text "Cancel" ]
                    ]
                ]
            ]
        ]


viewProject : String -> Html Msg
viewProject projectName =
    div []
        [ h1 [ style "font-size" "2rem", style "margin-bottom" "1.5rem" ]
            [ text ("Project: " ++ projectName) ]
        , div [ class "grid gap-4" ]
            [ div [ class "card" ]
                [ h2 [ style "font-size" "1.25rem", style "margin-bottom" "0.75rem" ] [ text "Languages" ]
                , p [ class "text-secondary" ] [ text "Select a language to start translating" ]
                ]
            ]
        ]


viewLanguageSelection : String -> Html Msg
viewLanguageSelection projectName =
    div []
        [ h1 [] [ text ("Select Language - " ++ projectName) ]
        ]


viewFileSelection : String -> String -> Html Msg
viewFileSelection projectName language =
    div []
        [ h1 [] [ text ("Select File - " ++ projectName ++ " (" ++ language ++ ")") ]
        ]


viewTranslationEditor : String -> String -> String -> Html Msg
viewTranslationEditor projectName language filename =
    div []
        [ h1 [ style "font-size" "1.75rem", style "margin-bottom" "1rem" ]
            [ text "Translation Editor" ]
        , div [ class "flex gap-2", style "margin-bottom" "1.5rem" ]
            [ span [ class "badge" ] [ text projectName ]
            , span [ class "badge neutral" ] [ text language ]
            , span [ class "code-chip" ] [ text filename ]
            ]
        , div [ class "card" ]
            [ p [ class "text-secondary" ] [ text "Translation editor content will be loaded here" ]
            ]
        ]


viewProjectSettings : String -> Html Msg
viewProjectSettings projectName =
    div []
        [ h1 [] [ text ("Settings - " ++ projectName) ]
        ]


viewHistory : Html Msg
viewHistory =
    div []
        [ h1 [ style "font-size" "2rem", style "margin-bottom" "1.5rem" ] [ text "Translation History" ]
        , div [ class "card" ]
            [ p [ class "text-secondary" ] [ text "Your translation history will appear here" ]
            ]
        ]


viewNotFound : Html Msg
viewNotFound =
    viewEmptyState "404 - Page Not Found" "The page you're looking for doesn't exist."


-- HELPER VIEWS


viewEmptyState : String -> String -> Html Msg
viewEmptyState title description =
    div [ class "empty-state" ]
        [ div [ class "icon" ]
            [ span [ style "font-size" "2.5rem" ] [ text "📭" ] ]
        , div [ class "title" ] [ text title ]
        , div [ class "description" ] [ text description ]
        ]


viewLoading : Html Msg
viewLoading =
    div [ class "text-center", style "padding" "3rem" ]
        [ div [ class "animate-pulse", style "color" "var(--text-muted)" ]
            [ text "Loading..." ]
        ]
