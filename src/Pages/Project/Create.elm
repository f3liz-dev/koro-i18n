module Pages.Project.Create exposing (Model, Msg(..), init, update, view)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onInput, onSubmit)
import Http
import Api
import Browser.Navigation as Nav

type alias Model =
    { name : String
    , description : String
    , submitting : Bool
    , error : Maybe String
    }

type Msg
    = NameChanged String
    | DescriptionChanged String
    | SubmitForm
    | GotResult (Result Http.Error Api.Project)

init : ( Model, Cmd Msg )
init =
    ( { name = ""
      , description = ""
      , submitting = False
      , error = Nothing
      }
    , Cmd.none
    )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NameChanged name ->
            ( { model | name = name }, Cmd.none )

        DescriptionChanged desc ->
            ( { model | description = desc }, Cmd.none )

        SubmitForm ->
            if String.isEmpty model.name then
                ( { model | error = Just "Project name is required" }, Cmd.none )
            else
                ( { model | submitting = True, error = Nothing }
                , Api.createProject { name = model.name, description = model.description } GotResult
                )

        GotResult result ->
            case result of
                Ok _ ->
                    ( { model | submitting = False }
                    -- In Main we would handle redirection, but for now we just clear state
                    -- Ideally Main handles the success and redirects
                    , Cmd.none
                    )

                Err _ ->
                    ( { model | submitting = False, error = Just "Failed to create project" }
                    , Cmd.none
                    )

view : Model -> Html Msg
view model =
    div [ class "container main flex justify-center" ]
        [ div [ class "card max-w-lg w-full" ]
            [ h1 [ class "text-2xl font-bold mb-6" ] [ text "Create New Project" ]
            , Html.form [ onSubmit SubmitForm, class "flex flex-col gap-4" ]
                [ div []
                    [ label [ class "label" ] [ text "Project Name" ]
                    , input
                        [ type_ "text"
                        , class "input"
                        , placeholder "e.g., my-awesome-app"
                        , value model.name
                        , onInput NameChanged
                        , disabled model.submitting
                        ]
                        []
                    ]
                , div []
                    [ label [ class "label" ] [ text "Description" ]
                    , textarea
                        [ class "input"
                        , placeholder "Brief description of the project"
                        , value model.description
                        , onInput DescriptionChanged
                        , disabled model.submitting
                        , rows 3
                        ]
                        []
                    ]
                , case model.error of
                    Just err -> div [ class "message error" ] [ text err ]
                    Nothing -> text ""

                , div [ class "flex justify-end gap-3 mt-4" ]
                    [ a [ href "/dashboard", class "btn ghost" ] [ text "Cancel" ]
                    , button
                        [ type_ "submit"
                        , class "btn primary"
                        , disabled model.submitting
                        ]
                        [ text (if model.submitting then "Creating..." else "Create Project") ]
                    ]
                ]
            ]
        ]
