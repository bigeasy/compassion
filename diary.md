## Sun Oct 13 20:57:44 CDT 2019

The user application is going to be an object. It is going to be constructed by
Compassion on the user's behalf. The first argument to the constructor is the
conference. When you build your application you pass the constructor function
and you receive as a return value the constructed application object. If you
want to expose the conference object, make it a public property of your
application object. Any arguments you want to pass to the constructor come after
the constructor property in the construction function and are received after the
`conference` argument to your application constructor.

The application object implements an interface. That interface is the `dispatch`
method and the `snapshot` method. They are separate because they are separate
network calls. `dispatch` only ever happens one at a time in a series, whereas
`snapshot` can come at any time, it is the out-of-band channel to transport the
initial state between nodes. One end is `join`. The other end is `snapshot`.

I tend to do things as functions and have the user bind or shim with an
anonymous function, but that is in lower level libraries like Avenue and
Destructible. At this level having the formalism of an object interface seems
more appropriate. Can't imagine how to do this with `EventEmitter`s because they
are not `async`. Rubbishing the inkling that this paragraph has given me that a
new event dispatch interface is needed.

I'm feeling good enough about `Destructible` that I'm willing to introduce it
end users, but I won't. I'll be using it myself in my applications, it is
already here with Compassion, so I can explain that it is an inversion of
control or some such, so that it isn't such a heavy lift to get it into the
heads of anyone who is adopting. Look, if you need to start some long running
process when your consensus application starts, you can start it in a
constructor using `Destructible`. However, if you really do have something you
need to `await` one time, like a configuration file read or startign a server,
then you can start it before you feed it to the application constructor as an
argument.

Your application is going to be a variable state machine, though. You won't be
able to really make use of it until it is ready. Checking the `ready` property
of the conference after construction is probably a good move before you start to
use your application. You can either expose the entire conference as a property
of your application or make the `ready` property of the conference a property of
your application.
