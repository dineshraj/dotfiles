class Student {
  fullName: string;
  constructor(public firstName)
}

interface Person {
  firstName: string;
  lastName: string;
}

function greeter(person: Person) {
    return `Hello, ${person.firstName} ${person.lastName}`;
}

const user = { firstName: 'Jane', lastName: 'User'};

document.body.innerHTML = greeter(user);
