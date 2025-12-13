module Pages.Login exposing (Model, Msg, init, update, view)

import Html exposing (..)
import Html.Attributes exposing (..)

type alias Model =
    {}

type Msg
    = NoOp

init : ( Model, Cmd Msg )
init =
    ( {}, Cmd.none )

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    ( model, Cmd.none )

view : Model -> Html Msg
view _ =
    div [ class "container main flex items-center justify-center" ]
        [ div [ class "card max-w-md w-full" ]
            [ h2 [ class "text-2xl font-bold mb-6 text-center" ] [ text "Sign in to your account" ]
            , div [ class "flex flex-col gap-4" ]
                [ a [ href "/api/auth/github", class "btn primary w-full justify-center" ]
                    [ text "Sign in with GitHub" ]
                ]
            ]
        ]
