interface Person {
  firstName: string,
  lastName: string
}

function greeter(person: string) {
    return "Hello, " + person;
}

let user = "Jane User";

document.body.innerHTML = greeter(user);
