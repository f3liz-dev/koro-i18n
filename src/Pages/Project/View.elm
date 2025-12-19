module Pages.Project.View exposing (Model, Msg(..), init, update, view)

import Html exposing (..)
import Html.Attributes exposing (..)
import Http
import Api

type alias Model =
    { projectName : String
    , project : Maybe Api.Project
    , loading : Bool
    , error : Maybe String
    }

type Msg
    = GotProjects (Result Http.Error (List Api.Project))

init : String -> ( Model, Cmd Msg )
init projectName =
    ( { projectName = projectName
      , project = Nothing
      , loading = True
      , error = Nothing
      }
    , Api.getProjects GotProjects
    )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotProjects result ->
            case result of
                Ok projects ->
                    let
                        project =
                            List.filter (\p -> p.name == model.projectName) projects
                                |> List.head
                    in
                    ( { model | project = project, loading = False }, Cmd.none )

                Err _ ->
                    ( { model | loading = False, error = Just "Failed to load project" }, Cmd.none )

view : Model -> Html Msg
view model =
    div [ class "container main" ]
        [ div [ class "flex justify-between items-center mb-6" ]
            [ div []
                [ h1 [ class "text-2xl font-bold" ] [ text ("Project: " ++ model.projectName) ]
                , case model.project of
                    Just proj -> p [ class "text-sm text-secondary" ] [ text proj.description ]
                    Nothing -> text ""
                ]
            , div [ class "flex gap-2" ]
                [ a [ href ("/projects/" ++ model.projectName ++ "/translations"), class "btn ghost" ] [ text "Translations" ]
                , a [ href ("/projects/" ++ model.projectName ++ "/files"), class "btn ghost" ] [ text "Files" ]
                , a [ href ("/projects/" ++ model.projectName ++ "/members"), class "btn ghost" ] [ text "Members" ]
                , a [ href ("/projects/" ++ model.projectName ++ "/apply"), class "btn ghost" ] [ text "Apply" ]
                ]
            ]

        , if model.loading then
            div [ class "flex justify-center p-8" ] [ div [ class "animate-spin rounded-full h-8 w-8 border-b-2 border-primary" ] [] ]
          else
            case model.error of
                Just err -> div [ class "message error" ] [ text err ]
                Nothing ->
                    case model.project of
                        Just proj ->
                            div []
                                [ p [ class "mb-4" ] [ text ("Repository: " ++ proj.name) ]
                                ]
                        Nothing -> div [ class "empty-state" ] [ div [ class "icon" ] [ text "📂" ], h3 [ class "title" ] [ text "Project not found" ] ]
        ]
