module Auth exposing (User, Model(..), init, isLoggedIn, isLoggedOut)

import Api

type alias User = Api.User

type Model
    = Checking
    | LoggedIn User
    | LoggedOut

init : Model
init =
    Checking

isLoggedIn : Model -> Bool
isLoggedIn model =
    case model of
        LoggedIn _ -> True
        _ -> False

isLoggedOut : Model -> Bool
isLoggedOut model =
    case model of
        LoggedOut -> True
        _ -> False
