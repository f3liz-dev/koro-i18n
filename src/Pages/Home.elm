module Pages.Home exposing (view)

import Html exposing (..)
import Html.Attributes exposing (..)

view : Html msg
view =
    div [ class "container main" ]
        [ div [ class "flex flex-col items-center justify-center space-y-4" ]
            [ h1 [ class "text-4xl font-bold" ] [ text "Welcome to i18n Platform" ]
            , p [ class "text-lg text-secondary max-w-lg text-center" ]
                [ text "Translate your applications with ease using AI-powered translations." ]
            , div [ class "flex gap-4" ]
                [ a [ href "/login", class "btn primary lg" ] [ text "Get Started" ]
                , a [ href "/docs", class "btn ghost lg" ] [ text "Read Docs" ]
                ]
            ]
        ]
