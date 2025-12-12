module Components.Toast exposing (Toast, Type(..), view, viewContainer)

import Html exposing (..)
import Html.Attributes exposing (..)

type alias Toast =
    { id : Int
    , message : String
    , type_ : Type
    }

type Type
    = Success
    | Error
    | Info

viewContainer : List Toast -> Html msg
viewContainer toasts =
    div [ class "fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none" ]
        (List.map view toasts)

view : Toast -> Html msg
view toast =
    div [ class ("pointer-events-auto message shadow-lg animate-slide-in-right " ++ classForType toast.type_) ]
        [ text toast.message ]

classForType : Type -> String
classForType type_ =
    case type_ of
        Success -> "success"
        Error -> "error"
        Info -> "info"
