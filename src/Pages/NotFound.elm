module Pages.NotFound exposing (view)

import Html exposing (..)
import Html.Attributes exposing (..)

view : Html msg
view =
    div [ class "container main flex flex-col items-center justify-center" ]
        [ h1 [ class "text-6xl font-bold mb-4" ] [ text "404" ]
        , p [ class "text-xl text-secondary mb-8" ] [ text "Page not found" ]
        , a [ href "/", class "btn primary" ] [ text "Go Home" ]
        ]
