module Pages.Login exposing (Model, Msg, init, update, view)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick)
import Browser.Navigation as Nav

type alias Model =
    { backendUrl : String }

type Msg
    = StartOAuth
    | NoOp

init : String -> ( Model, Cmd Msg )
init backendUrl =
    ( { backendUrl = backendUrl }, Cmd.none )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        StartOAuth ->
            let
                url = model.backendUrl ++ "/api/auth/github"
            in
            ( model, Nav.load url )

        NoOp ->
            ( model, Cmd.none )

view : Model -> Html Msg
view model =
    div [ class "container main flex items-center justify-center" ]
        [ div [ class "card max-w-md w-full" ]
            [ h2 [ class "text-2xl font-bold mb-6 text-center" ] [ text "Sign in to your account" ]
            , div [ class "flex flex-col gap-4" ]
                [ button [ onClick StartOAuth, class "btn primary w-full justify-center" ]
                    [ text "Sign in with GitHub" ]
                ]
            ]
        ]
