module Pages.Dashboard exposing (Model, Msg, init, update, view)

import Html exposing (..)
import Html.Attributes exposing (..)
import Http
import Api

type alias Model =
    { projects : List Api.Project
    , loading : Bool
    , error : Maybe String
    }

type Msg
    = GotProjects (Result Http.Error (List Api.Project))

init : ( Model, Cmd Msg )
init =
    ( { projects = [], loading = True, error = Nothing }
    , Api.getProjects GotProjects
    )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotProjects result ->
            case result of
                Ok projects ->
                    ( { model | projects = projects, loading = False }, Cmd.none )

                Err _ ->
                    ( { model | loading = False, error = Just "Failed to load projects" }, Cmd.none )

view : Model -> Html Msg
view model =
    div [ class "container main" ]
        [ div [ class "flex justify-between items-center mb-8" ]
            [ h1 [ class "text-2xl font-bold" ] [ text "Dashboard" ]
            , a [ href "/projects/new", class "btn primary" ] [ text "New Project" ]
            ]
        , if model.loading then
            div [ class "flex justify-center p-8" ] [ div [ class "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" ] [] ]
          else
            case model.error of
                Just err ->
                    div [ class "message error" ] [ text err ]

                Nothing ->
                    if List.isEmpty model.projects then
                        div [ class "empty-state" ]
                            [ div [ class "icon" ] [ text "📂" ]
                            , h3 [ class "title" ] [ text "No projects yet" ]
                            , p [ class "description" ] [ text "Create your first project to start translating." ]
                            ]
                    else
                        div [ class "grid grid-3 gap-6" ]
                            (List.map viewProjectCard model.projects)
        ]

viewProjectCard : Api.Project -> Html Msg
viewProjectCard project =
    div [ class "card interactive" ]
        [ h3 [ class "font-bold mb-2" ] [ text project.name ]
        , p [ class "text-sm text-secondary mb-4" ] [ text project.description ]
        , div [ class "flex justify-between items-center" ]
            [ span [ class "badge success" ] [ text "Active" ]
            ]
        ]
